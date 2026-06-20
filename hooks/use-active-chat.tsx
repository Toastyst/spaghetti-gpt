"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname } from "next/navigation";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useDataStream } from "@/components/chat/data-stream-provider";
import { getChatHistoryPaginationKey } from "@/components/chat/sidebar-history";
import { toast } from "@/components/chat/toast";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { Vote } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";

export type ModelRoutingInfo = {
  model: string;
  isOracle: boolean;
  reason?: string;
};

export type OracleRoutingState = {
  isOracleThinking: boolean;
  pendingModelInfo?: ModelRoutingInfo;
};

type ActiveChatContextValue = {
  chatId: string;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  visibilityType: VisibilityType;
  isReadonly: boolean;
  isLoading: boolean;
  votes: Vote[] | undefined;
  currentModelId: string;
  setCurrentModelId: (id: string) => void;
  showCreditCardAlert: boolean;
  setShowCreditCardAlert: Dispatch<SetStateAction<boolean>>;
  oracleRouting: OracleRoutingState;
  getModelInfoForMessage: (messageId: string) => ModelRoutingInfo | undefined;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

function extractChatId(pathname: string): string | null {
  const match = pathname.match(/\/chat\/([^\/]+)/);
  return match ? match[1] : null;
}

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  const [oracleRouting, setOracleRouting] = useState<OracleRoutingState>({
    isOracleThinking: false,
  });
  const pendingModelInfoRef = useRef<ModelRoutingInfo | undefined>(undefined);
  const modelInfoByMessageIdRef = useRef<Record<string, ModelRoutingInfo>>({});
  const messagesRef = useRef<ChatMessage[]>([]);
  const [modelInfoVersion, setModelInfoVersion] = useState(0);

  const chatIdFromUrl = extractChatId(pathname);
  const isNewChat = !chatIdFromUrl;
  const newChatIdRef = useRef(generateUUID());
  const prevPathnameRef = useRef(pathname);

  if (isNewChat && prevPathnameRef.current !== pathname) {
    newChatIdRef.current = generateUUID();
  }
  prevPathnameRef.current = pathname;

  const chatId = chatIdFromUrl ?? newChatIdRef.current;

  const [currentModelId, setCurrentModelId] = useState(DEFAULT_CHAT_MODEL);
  const currentModelIdRef = useRef(currentModelId);
  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const [input, setInput] = useState("");
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);

  const { data: chatData, isLoading } = useSWR(
    isNewChat
      ? null
      : `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages?chatId=${chatId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const initialMessages: ChatMessage[] = isNewChat
    ? []
    : (chatData?.messages ?? []);
  const visibility: VisibilityType = isNewChat
    ? "private"
    : (chatData?.visibility ?? "private");

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id: chatId,
    messages: initialMessages,
    generateId: generateUUID,
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      return (
        lastMessage?.parts?.some(
          (part) =>
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true
        ) ?? false
      );
    },
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat`,
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        const isToolApprovalContinuation =
          lastMessage?.role !== "user" ||
          request.messages.some((msg) =>
            msg.parts?.some((part) => {
              const state = (part as { state?: string }).state;
              return (
                state === "approval-responded" || state === "output-denied"
              );
            })
          );

        return {
          body: {
            id: request.id,
            ...(isToolApprovalContinuation
              ? { messages: request.messages }
              : { message: lastMessage }),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibility,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      // Oracle routing events use a separate channel so DataStreamHandler can follow the
      // template pattern (consume artifact deltas, then clear the stream).
      if (dataPart.type === "data-oracle-thinking") {
        pendingModelInfoRef.current = undefined;
        setOracleRouting({ isOracleThinking: true });
        return;
      }

      if (dataPart.type === "data-model-used") {
        const raw = dataPart.data;
        if (
          !raw ||
          typeof raw !== "object" ||
          !("model" in raw) ||
          typeof (raw as ModelRoutingInfo).model !== "string"
        ) {
          return;
        }
        const modelInfo = raw as ModelRoutingInfo;
        pendingModelInfoRef.current = modelInfo;
        setOracleRouting({
          isOracleThinking: false,
          pendingModelInfo: modelInfo,
        });
        return;
      }

      setDataStream((ds) => (ds ? [...ds, dataPart] : [dataPart]));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      setDataStream([]);
    },
    onError: (error) => {
      if (error instanceof ChatbotError) {
        const description =
          error.cause === "User not found"
            ? "Your session is invalid or the user no longer exists. Please sign in again."
            : error.message;
        toast({ type: "error", description });
      } else {
        toast({
          type: "error",
          description: error.message || "Oops, an error occurred!",
        });
      }
    },
  });

  const loadedChatIds = useRef(new Set<string>());

  if (isNewChat && !loadedChatIds.current.has(newChatIdRef.current)) {
    loadedChatIds.current.add(newChatIdRef.current);
  }

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (loadedChatIds.current.has(chatId)) {
      return;
    }
    // Never overwrite live streaming state with a partial DB snapshot.
    if (status === "streaming" || status === "submitted") {
      return;
    }
    if (chatData?.messages) {
      loadedChatIds.current.add(chatId);
      setMessages(chatData.messages);
    }
  }, [chatId, chatData?.messages, setMessages, status]);

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      if (isNewChat) {
        setMessages([]);
      }
    }
  }, [chatId, isNewChat, setMessages]);

  useEffect(() => {
    if (chatData && !isNewChat) {
      const cookieModel = document.cookie
        .split("; ")
        .find((row) => row.startsWith("chat-model="))
        ?.split("=")[1];
      if (cookieModel) {
        setCurrentModelId(decodeURIComponent(cookieModel));
      }
    }
  }, [chatData, isNewChat]);

  const hasAppendedQueryRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query");
    if (query && !hasAppendedQueryRef.current) {
      hasAppendedQueryRef.current = true;
      window.history.replaceState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });
    }
  }, [sendMessage, chatId]);

  useAutoResume({
    autoResume: !isNewChat && !!chatData,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const isReadonly = isNewChat ? false : (chatData?.isReadonly ?? false);

  const { data: votes } = useSWR<Vote[]>(
    !isReadonly && messages.length >= 2
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Lifecycle: reset on new request; attach model pill after stream completes.
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prev = prevStatusRef.current;

    if (prev !== "submitted" && status === "submitted") {
      pendingModelInfoRef.current = undefined;
      setOracleRouting({ isOracleThinking: false });
      setDataStream([]);
    }

    if (prev === "streaming" && status === "ready") {
      const modelInfo = pendingModelInfoRef.current;
      const lastAssistant = [...messagesRef.current]
        .reverse()
        .find((m) => m.role === "assistant");

      if (modelInfo?.model && lastAssistant) {
        modelInfoByMessageIdRef.current[lastAssistant.id] = modelInfo;
        setModelInfoVersion((v) => v + 1);
      }

      pendingModelInfoRef.current = undefined;
      setOracleRouting((current) => ({
        ...current,
        isOracleThinking: false,
        pendingModelInfo: undefined,
      }));
    }

    prevStatusRef.current = status;
  }, [status, setDataStream]);

  const getModelInfoForMessage = useCallback(
    (messageId: string) => modelInfoByMessageIdRef.current[messageId],
    // modelInfoVersion bumps when a new pill is stored
    [modelInfoVersion]
  );

  const value = useMemo<ActiveChatContextValue>(
    () => ({
      chatId,
      messages,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
      input,
      setInput,
      visibilityType: visibility,
      isReadonly,
      isLoading: !isNewChat && isLoading,
      votes,
      currentModelId,
      setCurrentModelId,
      showCreditCardAlert,
      setShowCreditCardAlert,
      oracleRouting,
      getModelInfoForMessage,
    }),
    [
      chatId,
      messages,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
      input,
      visibility,
      isReadonly,
      isNewChat,
      isLoading,
      votes,
      currentModelId,
      showCreditCardAlert,
      oracleRouting,
      getModelInfoForMessage,
    ]
  );

  return (
    <ActiveChatContext.Provider value={value}>
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext);
  if (!context) {
    throw new Error("useActiveChat must be used within ActiveChatProvider");
  }
  return context;
}

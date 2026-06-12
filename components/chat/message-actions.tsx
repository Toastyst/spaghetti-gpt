import equal from "fast-deep-equal";
import { memo } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import {
  MessageAction as Action,
  MessageActions as Actions,
} from "../ai-elements/message";
import { CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";
import { RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  onEdit,
  regenerate,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  onEdit?: () => void;
  regenerate?: UseChatHelpers<ChatMessage>["regenerate"];
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();
  const { speak, stop, isSpeaking, voices, selectedVoice, setSelectedVoice } = useTTS();

  if (isLoading) {
    return null;
  }

  const textFromParts = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  const handleCopy = async () => {
    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success("Copied to clipboard!");
  };

  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end flex items-center gap-0.5">
        {onEdit && (
          <Action
            className="size-7 text-muted-foreground/50 hover:text-foreground"
            data-testid="message-edit-button"
            onClick={onEdit}
            tooltip="Edit"
          >
            <PencilEditIcon />
          </Action>
        )}
        <Action
          className="size-7 text-muted-foreground/50 hover:text-foreground"
          onClick={handleCopy}
          tooltip="Copy"
        >
          <CopyIcon />
        </Action>
      </Actions>
    );
  }

  return (
    <Actions className="-ml-0.5 flex items-center gap-1 flex-wrap">
      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        onClick={handleCopy}
        tooltip="Copy"
      >
        <CopyIcon />
      </Action>

      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        onClick={() => {
          if (!textFromParts) return;
          if (isSpeaking) {
            stop();
          } else {
            speak(textFromParts);
          }
        }}
        tooltip={isSpeaking ? "Stop speaking" : "Speak response aloud"}
      >
        {isSpeaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </Action>

      {voices.length > 1 && (
        <select
          className="text-[10px] bg-background/80 border border-border/60 rounded px-1.5 py-0.5 text-muted-foreground cursor-pointer hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={selectedVoice?.name || ''}
          onChange={(e) => {
            const v = voices.find(vv => vv.name === e.target.value);
            if (v) setSelectedVoice(v);
          }}
          title="Choose voice (saved automatically)"
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name.length > 18 ? v.name.substring(0, 16) + '…' : v.name}
            </option>
          ))}
        </select>
      )}

      {regenerate && (
        <Action
          className="text-muted-foreground/50 hover:text-foreground"
          onClick={() => regenerate({ messageId: message.id })}
          tooltip="Refresh reply"
          data-testid="message-refresh"
        >
          <RefreshCw className="size-4" />
        </Action>
      )}

      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        data-testid="message-upvote"
        disabled={vote?.isUpvoted}
        onClick={() => {
          const upvote = fetch(
            `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote`,
            {
              method: "PATCH",
              body: JSON.stringify({
                chatId,
                messageId: message.id,
                type: "up",
              }),
            }
          );

          toast.promise(upvote, {
            loading: "Upvoting Response...",
            success: () => {
              mutate<Vote[]>(
                `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`,
                (currentVotes) => {
                  if (!currentVotes) {
                    return [];
                  }

                  const votesWithoutCurrent = currentVotes.filter(
                    (currentVote) => currentVote.messageId !== message.id
                  );

                  return [
                    ...votesWithoutCurrent,
                    {
                      chatId,
                      messageId: message.id,
                      isUpvoted: true,
                    },
                  ];
                },
                { revalidate: false }
              );

              return "Upvoted Response!";
            },
            error: "Failed to upvote response.",
          });
        }}
        tooltip="Upvote Response"
      >
        <ThumbUpIcon />
      </Action>

      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        data-testid="message-downvote"
        disabled={vote && !vote.isUpvoted}
        onClick={() => {
          const downvote = fetch(
            `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote`,
            {
              method: "PATCH",
              body: JSON.stringify({
                chatId,
                messageId: message.id,
                type: "down",
              }),
            }
          );

          toast.promise(downvote, {
            loading: "Downvoting Response...",
            success: () => {
              mutate<Vote[]>(
                `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`,
                (currentVotes) => {
                  if (!currentVotes) {
                    return [];
                  }

                  const votesWithoutCurrent = currentVotes.filter(
                    (currentVote) => currentVote.messageId !== message.id
                  );

                  return [
                    ...votesWithoutCurrent,
                    {
                      chatId,
                      messageId: message.id,
                      isUpvoted: false,
                    },
                  ];
                },
                { revalidate: false }
              );

              return "Downvoted Response!";
            },
            error: "Failed to downvote response.",
          });
        }}
        tooltip="Downvote Response"
      >
        <ThumbDownIcon />
      </Action>
    </Actions>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    // Regenerate function identity can change; we don't block re-renders on it
    return true;
  }
);

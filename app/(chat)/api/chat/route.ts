const stream = createUIMessageStream({
  originalMessages: isToolApprovalFlow ? uiMessages : undefined,
  execute: async ({ writer: dataStream }) => {
    let activeModelId = chatModel;
    let modelDisplayName = "Unknown";
    let isOracleRouted = false;

    if (chatModel === "spaghetti-oracle") {
      dataStream.write({
        type: "data-oracle-thinking",
        data: { status: "routing" },
      });

      try {
        const routed = await resolveSpaghettiOracle(modelMessages);
        activeModelId = routed.id;
        modelDisplayName = routed.friendlyName;
        isOracleRouted = true;
      } catch (err) {
        console.error("[Oracle] Failed to resolve, falling back", err);
        activeModelId = DEFAULT_CHAT_MODEL;
        modelDisplayName = "Owl Alpha";
        isOracleRouted = true;
      }
    } else {
      const modelInfo = chatModels.find((m) => m.id === chatModel);
      modelDisplayName = modelInfo?.name || chatModel;
    }

    dataStream.write({
      type: "data-model-used",
      data: {
        model: modelDisplayName,
        isOracle: isOracleRouted,
      },
    });

    const result = streamText({
      model: getLanguageModel(activeModelId),
      system: systemPrompt({ requestHints, supportsTools }),
      messages: modelMessages,
      stopWhen: stepCountIs(5),
      experimental_activeTools:
        isReasoningModel && !supportsTools
          ? []
          : [
              "getWeather",
              "createDocument",
              "editDocument",
              "updateDocument",
              "requestSuggestions",
            ],
      providerOptions: {
        ...(modelConfig?.reasoningEffort && {
          openai: { reasoningEffort: modelConfig.reasoningEffort },
        }),
      },
      tools: {
        getWeather,
        createDocument: createDocument({
          session,
          dataStream,
          modelId: chatModel,
        }),
        editDocument: editDocument({ dataStream, session }),
        updateDocument: updateDocument({
          session,
          dataStream,
          modelId: chatModel,
        }),
        requestSuggestions: requestSuggestions({
          session,
          dataStream,
          modelId: chatModel,
        }),
      },
      experimental_telemetry: {
        isEnabled: isProductionEnvironment,
        functionId: "stream-text",
      },
    });

    dataStream.merge(
      result.toUIMessageStream({ sendReasoning: isReasoningModel })
    );

    if (titlePromise) {
      try {
        const title = await titlePromise;
        dataStream.write({ type: "data-chat-title", data: title });
        updateChatTitleById({ chatId: id, title });
      } catch (_) {
        /* non-fatal */
      }
    }
  },
  generateId: generateUUID,
  onFinish: async ({ messages: finishedMessages }) => {
    if (isToolApprovalFlow) {
      for (const finishedMsg of finishedMessages) {
        const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
        if (existingMsg) {
          await updateMessage({
            id: finishedMsg.id,
            parts: finishedMsg.parts,
          });
        } else {
          await saveMessages({
            messages: [
              {
                id: finishedMsg.id,
                role: finishedMsg.role,
                parts: finishedMsg.parts,
                createdAt: new Date(),
                attachments: [],
                chatId: id,
              },
            ],
          });
        }
      }
    } else if (finishedMessages.length > 0) {
      await saveMessages({
        messages: finishedMessages.map((currentMessage) => ({
          id: currentMessage.id,
          role: currentMessage.role,
          parts: currentMessage.parts,
          createdAt: new Date(),
          attachments: [],
          chatId: id,
        })),
      });
    }
  },
  onError: (error) => {
    if (error instanceof ChatbotError) {
      return error.message;
    }
    return "AI provider unavailable. Please configure an alternative provider (for example, set OPENROUTER_API_KEY) or enable Vercel AI Gateway in your deployment settings.";
  },
});
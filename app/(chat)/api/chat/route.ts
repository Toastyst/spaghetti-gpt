  execute: async ({ writer: dataStream }) => {
    let activeModelId = chatModel;
    let modelDisplayName = "Unknown";
    let isOracleRouted = false;

    if (chatModel === "spaghetti-oracle") {
      // Signal to frontend that Oracle is thinking
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

    // Send final model info for the bottom pill (Oracle + normal models)
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
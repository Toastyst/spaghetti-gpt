      execute: async ({ writer: dataStream }) => {
        let activeModelId = chatModel;

        if (chatModel === "spaghetti-oracle") {
          try {
            activeModelId = await resolveSpaghettiOracle(modelMessages);
          } catch (err) {
            console.error("[Oracle] Failed to resolve, falling back", err);
            activeModelId = DEFAULT_CHAT_MODEL;
          }
        }

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
                  "searchSpaghettiStories",
                  "webSearch",
                  "browsePage",
                  ...(useAiGateway ? ["webSearchGateway"] : []),
                ],
          providerOptions: {
            ...(modelConfig?.reasoningEffort && {
              openai: { reasoningEffort: modelConfig.reasoningEffort },
            }),
          },
          tools: {
            getWeather,
            createDocument,
            editDocument,
            updateDocument,
            requestSuggestions,
            searchSpaghettiStories,
            webSearch,
            browsePage,
            ...getAiGatewayTools(),
          },
        });

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      execute: async ({ writer: dataStream }) => {
        let activeModelId = chatModel;

        if (chatModel === "spaghetti-oracle") {
          try {
            activeModelId = await resolveSpaghettiOracle(modelMessages);
            // You can optionally stream a small data event here for UI feedback in the future
            // dataStream.write({ type: 'data', data: { oracleRoutedTo: activeModelId } });
          } catch (err) {
            console.error("[Oracle] Failed to resolve, falling back", err);
            activeModelId = DEFAULT_CHAT_MODEL;
          }
        }

        const result = streamText({
          model: getLanguageModel(activeModelId),
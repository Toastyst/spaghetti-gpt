    let activeModelId = chatModel;
    let modelDisplayName = chatModel; // fallback
    let isOracleRouted = false;

    if (chatModel === "spaghetti-oracle") {
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
      // Normal model selection - try to find friendly name
      const modelInfo = chatModels.find(m => m.id === chatModel);
      modelDisplayName = modelInfo?.name || chatModel;
    }

    // Send model info to frontend for the bottom pill
    dataStream.write({
      type: "data-model-used",
      data: {
        model: modelDisplayName,
        isOracle: isOracleRouted,
      },
    });

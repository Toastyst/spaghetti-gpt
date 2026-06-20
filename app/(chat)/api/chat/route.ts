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
export function createAIKeyStore(storage) {
  let migration;
  const migrate = (provider) =>
    (migration ||= (async () => {
      const legacy = await storage.getItemAsync("floco.ai.key");
      if (legacy) {
        const id = "floco.ai.key." + provider;
        if (!(await storage.getItemAsync(id)))
          await storage.setItemAsync(id, legacy);
        await storage.deleteItemAsync("floco.ai.key");
      }
    })().catch((error) => {
      migration = null;
      throw error;
    }));
  return {
    async getKey(provider) {
      await migrate(provider);
      return storage.getItemAsync("floco.ai.key." + provider);
    },
    async setKey(value, provider) {
      await migrate(provider);
      return value
        ? storage.setItemAsync("floco.ai.key." + provider, value)
        : storage.deleteItemAsync("floco.ai.key." + provider);
    },
  };
}

// Bundled by the test provider and content/utils/js.njk.
const authentication = {
    storageKey: "user",
    cached() {
        const name = localStorage.getItem("user");
        return name ? { id: "test-user", name } : null;
    },

    async restore() {
        return this.cached();
    },

    async signIn() {
        localStorage.setItem("user", "Test Username");
        return { id: "test-user", name: "Test Username" };
    },

    async signOut() {
        localStorage.removeItem("user");
        return null;
    },
};

// Bundled by content/utils/js.njk after the selected authentication method.
document.addEventListener("DOMContentLoaded", () => {
    const label = document.querySelector("#sidebar-user-menu-open span");
    const title = document.getElementById("user-menu-title");
    const signIn = document.getElementById("user-menu-sign-in");
    const signOut = document.getElementById("user-menu-sign-out");
    const cms = document.getElementById("user-menu-cms");
    const status = document.getElementById("user-menu-status");
    const dialog = document.getElementById("user-menu-dialog");
    if (!label || !title || !signIn || !signOut || !status) return;
    const signedOutLabel = label.textContent;
    let busy = false;
    let revision = 0;

    const renderUser = (user) => {
        label.textContent = title.textContent = user?.name || signedOutLabel;
        signIn.hidden = Boolean(user);
        signOut.hidden = !user;
        if (cms) cms.hidden = !user;
    };

    // A completed older request must display the current session, not its old result.
    const currentUser = user => authentication.cached ? authentication.cached() : user;

    const updateUser = async (action) => {
        if (busy) return;
        ++revision;
        busy = true;
        signIn.disabled = signOut.disabled = true;
        status.hidden = true;
        try {
            renderUser(currentUser(await action()));
            status.hidden = !authentication.error;
            if (dialog?.open) dialog.close();
        } catch {
            renderUser(currentUser(null));
            status.hidden = false;
        } finally {
            busy = false;
            signIn.disabled = signOut.disabled = false;
        }
    };

    signIn.addEventListener("click", () => {
        void updateUser(() => authentication.signIn());
    });
    signOut.addEventListener("click", () => {
        void updateUser(() => authentication.signOut());
    });

    const refresh = async () => {
        if (busy) return;
        const current = ++revision;
        status.hidden = true;
        renderUser(currentUser(null));
        try {
            const user = await authentication.restore();
            if (current !== revision) return;
            renderUser(currentUser(user));
            status.hidden = !authentication.error;
        } catch {
            if (current !== revision) return;
            renderUser(currentUser(null));
            // Only login/callback errors need feedback; display refresh is best effort.
            status.hidden = !authentication.error;
        }
    };

    window.addEventListener("pageshow", event => {
        if (event.persisted) void refresh();
    });
    window.addEventListener("storage", event => {
        if (authentication.storageKey && event.storageArea === localStorage &&
            (event.key === null || event.key === authentication.storageKey)) {
            renderUser(currentUser(null));
        }
    });
    if (typeof cmsSession !== "undefined") cmsSession.onChange(() => renderUser(currentUser(null)));
    // On the shared CMS entry page the gate validates the session and publishes
    // updates through the same adapter, so do not start a second restore.
    if (typeof cmsSession !== "undefined" && document.querySelector("#cms-gate[data-cms-script]")) renderUser(currentUser(null));
    else void refresh();
});

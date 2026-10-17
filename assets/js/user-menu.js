// Bundled by content/utils/js.njk after the selected authentication method.
document.addEventListener("DOMContentLoaded", () => {
    const label = document.querySelector("#sidebar-user-menu-open span");
    const title = document.getElementById("user-menu-title");
    const signIn = document.getElementById("user-menu-sign-in");
    const signOut = document.getElementById("user-menu-sign-out");
    const status = document.getElementById("user-menu-status");
    const dialog = document.getElementById("user-menu-dialog");
    if (!label || !title || !signIn || !signOut || !status) return;
    const signedOutLabel = label.textContent;
    let busy = false;

    const renderUser = (user) => {
        label.textContent = title.textContent = user?.name || signedOutLabel;
        signIn.hidden = Boolean(user);
        signOut.hidden = !user;
    };

    const updateUser = async (action, closeOnSuccess = false) => {
        if (busy) return;
        busy = true;
        signIn.disabled = signOut.disabled = true;
        status.hidden = true;
        try {
            renderUser(await action());
            status.hidden = !authentication.error;
            if (closeOnSuccess && dialog?.open) dialog.close();
        } catch {
            renderUser(null);
            status.hidden = false;
        } finally {
            busy = false;
            signIn.disabled = signOut.disabled = false;
        }
    };

    signIn.addEventListener("click", () => {
        void updateUser(() => authentication.signIn(), true);
    });
    signOut.addEventListener("click", () => {
        void updateUser(() => authentication.signOut(), true);
    });

    void updateUser(() => authentication.restore());
});

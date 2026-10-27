// Shared mode reuses the site's controller before handing off to stock Sveltia.
export default async ({ authentication }) => {
    const status = document.getElementById("cms-status");
    const signIn = document.getElementById("cms-sign-in");
    const retry = document.getElementById("cms-retry");
    const failureKey = "emp.cms.error";
    const current = new URL(location.href);
    if (current.searchParams.has("logout")) {
        await authentication.signOut();
        current.searchParams.delete("logout");
        history.replaceState(null, "", current.href);
        sessionStorage.removeItem(failureKey);
    }
    signIn.addEventListener("click", async () => {
        signIn.disabled = true;
        try { await authentication.signIn(); }
        catch { status.textContent = cmsLabels.cms_error; signIn.disabled = false; }
    });
    retry.addEventListener("click", () => location.reload());
    const previousFailure = sessionStorage.getItem(failureKey);
    sessionStorage.removeItem(failureKey);
    try {
        const user = await authentication.restore();
        if (previousFailure || authentication.error) {
            status.textContent = previousFailure === "busy" ? cmsLabels.cms_other_session : cmsLabels.cms_error;
            signIn.hidden = Boolean(user);
            retry.hidden = false;
        } else if (!user) {
            status.textContent = cmsLabels.cms_sign_in_required;
            signIn.hidden = false;
        } else {
            await openEditor();
        }
    } catch (error) {
        sessionStorage.removeItem(failureKey);
        status.textContent = error.code === "CMS_CONTEXT_BUSY" ? cmsLabels.cms_other_session : cmsLabels.cms_error;
        retry.hidden = false;
    }
};

// Standalone mode prepares an isolated stock session, without an EMP provider.
void (async () => {
    const status = document.getElementById("cms-status");
    const retry = document.getElementById("cms-retry");
    retry.addEventListener("click", () => location.reload());
    const previousFailure = sessionStorage.getItem("emp.cms.error");
    sessionStorage.removeItem("emp.cms.error");
    if (previousFailure) {
        status.textContent = previousFailure === "busy" ? cmsLabels.cms_other_session : cmsLabels.cms_error;
        retry.hidden = false;
        return;
    }
    try {
        const guard = createCmsContext(cmsStandaloneContext);
        if (!guard.isCurrent()) {
            await guard.write(() => {
                localStorage.setItem("emp.cms.session", JSON.stringify({ context: cmsStandaloneContext, session: null }));
                localStorage.setItem("sveltia-cms.user", "{}");
            });
        }
        await openEditor();
    } catch (error) {
        sessionStorage.removeItem("emp.cms.error");
        status.textContent = error.code === "CMS_CONTEXT_BUSY" ? cmsLabels.cms_other_session : cmsLabels.cms_error;
        retry.hidden = false;
    }
})();

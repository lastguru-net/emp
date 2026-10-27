// The stock editor owns this document. Site CSS and UI stay on the entry page.
void (async () => {
    let leaving = false;
    const leave = (error, clearSession = false) => {
        if (leaving) return;
        leaving = true;
        // Preserve stock logout's provider cleanup, but never sign out a
        // replacement account or an incompatible CMS context.
        const logout = clearSession && cmsSession.clearIfSignedOut();
        if (error) sessionStorage.setItem("emp.cms.error", error.code === "CMS_CONTEXT_BUSY" ? "busy" : "load");
        location.replace(adminUrl + (logout ? "?logout=1" : "") + location.hash);
    };
    try {
        if (cmsMode === "shared") {
            const session = JSON.parse(cmsSession.getItem());
            if (!session?.user || !cmsSession.isCurrent(session.user.id)) { leave(); return; }
            const held = await cmsSession.hold(async () => {
                const invalidate = () => {
                    if (cmsSession.isCurrent(session.user.id)) return;
                    leave(undefined, true);
                };
                cmsSession.onChange(invalidate);
                // Stock logout writes in this document, which gets no storage
                // event. Let its configured redirect run before checking UI updates.
                let check;
                new MutationObserver(() => {
                    clearTimeout(check);
                    check = setTimeout(invalidate, 0);
                }).observe(document.body, { childList: true, subtree: true });
                window.CMS_MANUAL_INIT = true;
                const { default: CMS } = await import(adminVendorUrl);
                if (!cmsSession.isCurrent(session.user.id)) { leave(); return; }
                await CMS.init({ config: { ...cmsConfig, load_config_file: false } });
            });
            if (!held) leave();
        } else {
            const guard = createCmsContext(cmsStandaloneContext);
            if (!guard.isCurrent()) { leave(); return; }
            const held = await guard.hold(async () => {
                window.addEventListener("storage", () => { if (!guard.isCurrent()) leave(); });
                window.CMS_MANUAL_INIT = true;
                const { default: CMS } = await import(adminVendorUrl);
                if (!guard.isCurrent()) { leave(); return; }
                await CMS.init({ config: { ...cmsConfig, load_config_file: false } });
            });
            if (!held) leave();
        }
    } catch (error) { leave(error); }
})();

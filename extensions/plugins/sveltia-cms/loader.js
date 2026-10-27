// Reuse the site's provider and storage adapter; load the editor only here.
const cmsGate = document.querySelector("#cms-gate[data-cms-script]");
if (cmsGate) {
    void import(cmsGate.dataset.cmsScript)
        .then(({ default: mount }) => mount({ authentication }))
        .catch(() => {
            document.getElementById("cms-status").textContent = cmsGate.dataset.error;
            const retry = document.getElementById("cms-retry");
            retry.hidden = false;
            retry.onclick = () => location.reload();
        });
}

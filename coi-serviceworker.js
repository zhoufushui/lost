/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (!ev.data) return;
    if (ev.data.type === "deregister") {
      self.registration
        .unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
    }
  });

  self.addEventListener("fetch", function (event) {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
      return;
    }
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }
          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
          if (!coepCredentialless) {
            newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
          }
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepDegrading = (reloadedBySelf == "coepdegrade");

    if (!reloadedBySelf) {
      const coepCheck = document.createElement("script");
      coepCheck.async = true;
      coepCheck.src = "coi-serviceworker.js";
      document.head.appendChild(coepCheck);
    }

    if (navigator.serviceWorker.controller) {
      const reload = () => {
        if (!window.crossOriginIsolated) {
          if (coepDegrading) {
            coepCredentialless = true;
            navigator.serviceWorker.controller.postMessage("coepcredentialless");
          }
          window.sessionStorage.setItem("coiReloadedBySelf", coepDegrading ? "coepdegrade" : "true");
          window.location.reload();
        }
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", reload);
      } else {
        reload();
      }
    } else {
      navigator.serviceWorker.register(window.document.currentScript?.src || "coi-serviceworker.js").then(
        (reg) => {
          if (!window.crossOriginIsolated) {
            if (coepDegrading) {
              coepCredentialless = true;
              reg.active?.postMessage("coepcredentialless");
            }
            window.sessionStorage.setItem("coiReloadedBySelf", coepDegrading ? "coepdegrade" : "true");
            window.location.reload();
          } else {
            window.sessionStorage.removeItem("coiReloadedBySelf");
            reg.active?.postMessage("coepcredentialless");
          }
        },
        () => { console.error("COI service worker registration failed"); }
      );
    }
  })();
}

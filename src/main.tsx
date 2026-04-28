import "@logseq/libs";

type Folders = Record<string, string[]>;

function renderPanel() {
  const folders: Folders = (logseq.settings?.folders as Folders) || {};

  const folderHTML =
      Object.keys(folders).length === 0
          ? `<p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;padding:16px 0">
           No folders yet.<br/>Right-click a page to add one.
         </p>`
          : Object.entries(folders)
              .map(
                  ([folder, pages]) => `
          <div style="margin-bottom:8px">
            <div style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:4px 8px">
              ${folder}
            </div>
            ${pages
                      .map(
                          (page) => `
              <div
                class="folder-page-item"
                data-page="${page}"
                style="padding:4px 8px 4px 20px;border-radius:4px;cursor:pointer;color:rgba(255,255,255,0.7);font-size:13px"
                onmouseenter="this.style.background='rgba(255,255,255,0.08)'"
                onmouseleave="this.style.background='transparent'"
              >
                ${page}
              </div>
            `
                      )
                      .join("")}
          </div>
        `
              )
              .join("");

  return `
    <div id="folders-panel" style="
      width: 220px;
      background: #1e1e2e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      overflow: hidden;
      font-family: sans-serif;
    ">
      <div style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);font-size:13px;font-weight:600">
        📁 Folders
      </div>
      <div style="padding:8px;max-height:360px;overflow-y:auto">
        ${folderHTML}
      </div>
    </div>
  `;
}

async function main() {
  // Register the toolbar button
    logseq.provideModel({
        async togglePanel() {
            const existing = parent.document.getElementById("folders-panel-wrap");
            if (existing) {
                existing.remove();
                return;
            }

            const wrap = parent.document.createElement("div");
            wrap.id = "folders-panel-wrap";
            wrap.style.cssText = `
        position: fixed;
        top: 48px;
        right: 8px;
        z-index: 9999;
      `;
            wrap.innerHTML = renderPanel();
            parent.document.body.appendChild(wrap);

            wrap.querySelectorAll(".folder-page-item").forEach((el) => {
                el.addEventListener("click", async () => {
                    const page = el.getAttribute("data-page");
                    if (page) {
                        await logseq.App.pushState("page", { name: page });
                        wrap.remove();
                    }
                });
            });

            setTimeout(() => {
                parent.document.addEventListener(
                    "click",
                    (e) => {
                        if (!wrap.contains(e.target as Node)) wrap.remove();
                    },
                    { once: true }
                );
            }, 100);
        },
    });

    // registerUIItem AFTER
    logseq.App.registerUIItem("toolbar", {
        key: "logseq-folders-plugin",
        template: `
      <a class="button" data-on-click="togglePanel" title="Folders">
        📁
      </a>
    `,
    });

  logseq.App.registerPageMenuItem("Add to folder", async ({ page }) => {
    const folderName = await new Promise<string | null>((resolve) => {
      const wrap = parent.document.createElement("div");
      wrap.id = "folders-dialog-wrap";
      wrap.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: sans-serif;
      `;

      const folders: Folders = (logseq.settings?.folders as Folders) || {};
      const existingFolders = Object.keys(folders);

      wrap.innerHTML = `
        <div style="background:#1e1e2e;border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:20px;width:280px;display:flex;flex-direction:column;gap:12px">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0">
            Add <strong>"${page}"</strong> to folder:
          </p>
          <input
            id="folder-name-input"
            list="folder-suggestions-list"
            placeholder="Folder name..."
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:8px 10px;color:white;font-size:13px;outline:none"
          />
          <datalist id="folder-suggestions-list">
            ${existingFolders.map((f) => `<option value="${f}"/>`).join("")}
          </datalist>
          ${
          existingFolders.length > 0
              ? `<div style="display:flex;flex-wrap:wrap;gap:6px">
              ${existingFolders
                  .map(
                      (f) => `
                <button class="quick-folder" data-name="${f}" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:20px;color:rgba(255,255,255,0.6);font-size:11px;padding:3px 10px;cursor:pointer">
                  ${f}
                </button>
              `
                  )
                  .join("")}
            </div>`
              : ""
      }
          <div style="display:flex;justify-content:flex-end;gap:8px">
            <button id="folder-cancel" style="background:rgba(255,255,255,0.08);border:none;border-radius:6px;color:rgba(255,255,255,0.6);font-size:12px;padding:6px 14px;cursor:pointer">Cancel</button>
            <button id="folder-confirm" style="background:#4f6bed;border:none;border-radius:6px;color:white;font-size:12px;padding:6px 14px;cursor:pointer">Add</button>
          </div>
        </div>
      `;

      parent.document.body.appendChild(wrap);

      const input = wrap.querySelector("#folder-name-input") as HTMLInputElement;
      input.focus();

      wrap.querySelectorAll(".quick-folder").forEach((btn) => {
        btn.addEventListener("click", () => {
          input.value = btn.getAttribute("data-name") || "";
        });
      });

      wrap.querySelector("#folder-cancel")!.addEventListener("click", () => {
        wrap.remove();
        resolve(null);
      });

      const confirm = () => {
        const val = input.value.trim();
        wrap.remove();
        resolve(val || null);
      };

      wrap.querySelector("#folder-confirm")!.addEventListener("click", confirm);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirm();
        if (e.key === "Escape") { wrap.remove(); resolve(null); }
      });
    });

    if (!folderName) return;

    const folders: Folders = (logseq.settings?.folders as Folders) || {};
    if (!folders[folderName]) folders[folderName] = [];
    if (!folders[folderName].includes(page)) folders[folderName].push(page);
    logseq.updateSettings({ folders });
  });
}

logseq.ready(main).catch(console.error);
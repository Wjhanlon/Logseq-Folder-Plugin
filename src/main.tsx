import "@logseq/libs";

type Folders = Record<string, string[]>;

async function saveFolders(folders: Folders) {
    const plain = JSON.parse(JSON.stringify(folders));
    // First clear all existing folder keys by setting to null
    await logseq.updateSettings({ folders: null });
    // Then set the new value
    await logseq.updateSettings({ folders: plain });
}

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
            <div class="folder-header" data-folder="${folder}" style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:4px 8px;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:space-between"
              onmouseenter="this.style.background='rgba(255,255,255,0.05)'"
              onmouseleave="this.style.background='transparent'"
            >
              <span>${folder}</span>
            </div>
            ${pages
                        .map(
                            (page) => `
              <div
                class="folder-page-item"
                data-page="${page}"
                data-folder="${folder}"
                style="padding:4px 8px 4px 20px;border-radius:4px;cursor:pointer;color:rgba(255,255,255,0.7);font-size:13px;user-select:none"
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
        Folders
      </div>
      <div style="padding:8px;max-height:360px;overflow-y:auto">
        ${folderHTML}
      </div>
    </div>
  `;
}

function showContextMenu(x: number, y: number, items: { label: string; action: () => void }[]) {
    parent.document.getElementById("folders-context-menu")?.remove();

    const menu = parent.document.createElement("div");
    menu.id = "folders-context-menu";
    menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: #1e1e2e;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    z-index: 9999999;
    font-family: sans-serif;
    overflow: hidden;
    min-width: 160px;
  `;

    items.forEach(({ label, action }) => {
        const item = parent.document.createElement("div");
        item.textContent = label;
        item.style.cssText = `
      padding: 8px 14px;
      font-size: 13px;
      color: rgba(255,255,255,0.75);
      cursor: pointer;
    `;
        item.onmouseenter = () => (item.style.background = "rgba(255,255,255,0.08)");
        item.onmouseleave = () => (item.style.background = "transparent");
        item.addEventListener("click", () => {
            menu.remove();
            action();
        });
        menu.appendChild(item);
    });

    parent.document.body.appendChild(menu);

    setTimeout(() => {
        parent.document.addEventListener("click", () => menu.remove(), { once: true });
    }, 50);
}

function attachPanelEvents(wrap: HTMLElement) {
    wrap.querySelectorAll(".folder-page-item").forEach((el) => {
        el.addEventListener("click", async () => {
            const page = el.getAttribute("data-page");
            if (page) {
                await logseq.App.pushState("page", { name: page });
                wrap.remove();
            }
        });

        el.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const page = el.getAttribute("data-page")!;
            const folder = el.getAttribute("data-folder")!;
            showContextMenu((e as MouseEvent).clientX, (e as MouseEvent).clientY, [
                {
                    label: `Remove from "${folder}"`,
                    action: async () => {
                        const folders: Folders = JSON.parse(
                            JSON.stringify((logseq.settings?.folders as Folders) || {})
                        );
                        folders[folder] = folders[folder].filter((p) => p !== page);
                        //if (folders[folder].length === 0) delete folders[folder];
                        await saveFolders(folders);
                        wrap.remove();
                    },
                },
            ]);
        });
    });

    wrap.querySelectorAll(".folder-header").forEach((el) => {
        el.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const folder = el.getAttribute("data-folder")!;
            showContextMenu((e as MouseEvent).clientX, (e as MouseEvent).clientY, [
                {
                    label: `Delete folder "${folder}"`,
                    action: async () => {
                        const folders: Folders = JSON.parse(
                            JSON.stringify((logseq.settings?.folders as Folders) || {})
                        );
                        delete folders[folder];
                        await saveFolders(folders);
                        wrap.remove();
                    },
                },
            ]);
        });
    });
}

async function main() {
    logseq.provideModel({
        async togglePanel() {
            console.log("togglePanel called");
            console.log("parent.document:", parent.document);
            const existing = parent.document.getElementById("folders-panel-wrap");
            if (existing) {
                existing.remove();
                return;
            }

            const toolbarBtn = parent.document.querySelector(
                'a[title="Folders"]'
            ) as HTMLElement;
            console.log("toolbarBtn:", toolbarBtn);
            const rect = toolbarBtn?.getBoundingClientRect();
            console.log("rect:", rect);

            const wrap = parent.document.createElement("div");
            wrap.id = "folders-panel-wrap";
            wrap.style.cssText = `
                position: fixed;
                top: ${rect ? rect.bottom + 4 : 48}px;
                left: ${rect ? rect.left - 190 : 1400}px;
                z-index: 999999;
                width: 100px;
                height: 100px;
`;
            wrap.innerHTML = renderPanel();
            parent.document.body.appendChild(wrap);
            console.log("wrap in DOM:", parent.document.getElementById("folders-panel-wrap"));
            console.log("wrap style:", wrap.style.cssText);

            attachPanelEvents(wrap);

            setTimeout(() => {
                parent.document.addEventListener(
                    "mousedown",
                    (e) => {
                        const target = e.target as Node;
                        if (!wrap.contains(target) && !toolbarBtn?.contains(target)) {
                            wrap.remove();
                        }                    },
                    { once: true }
                );
            }, 100);
        },
    });

    logseq.App.registerUIItem("toolbar", {
        key: "logseq-folders-plugin",
        template: `
    <a class="button" data-on-click="togglePanel" title="Folders" style="display:flex;align-items:center;justify-content:center">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
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

            const folders: Folders = JSON.parse(
                JSON.stringify((logseq.settings?.folders as Folders) || {})
            );
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
                if (e.key === "Escape") {
                    wrap.remove();
                    resolve(null);
                }
            });
        });

        if (!folderName) return;

        const folders: Folders = JSON.parse(
            JSON.stringify((logseq.settings?.folders as Folders) || {})
        );
        if (!folders[folderName]) folders[folderName] = [];
        if (!folders[folderName].includes(page)) folders[folderName].push(page);
        saveFolders(folders);
    });
}

logseq.ready(main).catch(console.error);
/**
 * WINNEST OFFICIAL WEB PORTAL — SCRIPT SYSTEM
 * Implements interactive terminal simulation for the landing page.
 */

document.addEventListener("DOMContentLoaded", () => {
    initTerminalSimulation();
    initTerminalCopyButtons();
});

/**
 * Simulates terminal prompt and command executions sequentially.
 */
function initTerminalSimulation() {
    const cmdSpan = document.getElementById("terminal-cmd");
    const outputDiv = document.getElementById("terminal-output");
    if (!cmdSpan || !outputDiv) return;

    const terminalScripts = [
        {
            command: "winnest doctor",
            output: `Checking Node.js environment... (v22.1.0 >= v20) -> OK\nChecking Wine runners... (found /usr/bin/wine) -> OK\nChecking wineserver... (found /usr/bin/wineserver) -> OK\nChecking system shortcuts path... -> OK\n\nWinNest Status: Doctor checks passed. Ready to install apps.`
        },
        {
            command: "winnest install steam_setup.exe",
            output: `[winnest] Initializing app container 'steam'...\n[winnest] Creating isolated Wine prefix at ~/.local/share/winnest/apps/steam/prefix...\n[winnest] Extracting installer metadata & caching 'steam_setup.exe'...\n[wine] Spawning Wine process: wine steam_setup.exe /S\n[winnest] Parsing program registry files & detecting executables...\n[winnest] Creating desktop launcher integration: Steam.desktop\n\nWinNest: Successfully installed 'steam' (prefix isolated).`
        },
        {
            command: "winnest list",
            output: `ID          NAME          RUNNER       STATUS\nsteam       Steam         wine-9.0     Ready\nphotoshop   Photoshop     wine-8.21    Ready\nnotepadpp   Notepad++     wine-9.0     Active`
        },
        {
            command: "winnest run steam",
            output: `[winnest] Starting application 'steam' (Wine runner: wine-9.0)...\n[winnest] Executing 'steam.exe' in isolated environment...\n[winnest] Runtime logs are actively routed to:\n          ~/.local/share/winnest/apps/steam/logs/runtime.log\n[winnest] Process detached successfully. PID: 14205.`
        }
    ];

    let scriptIndex = 0;

    function runScript() {
        const script = terminalScripts[scriptIndex];
        cmdSpan.textContent = "";
        outputDiv.textContent = "";
        
        let charIndex = 0;
        const commandText = script.command;
        
        function typeCommand() {
            if (charIndex < commandText.length) {
                cmdSpan.textContent += commandText.charAt(charIndex);
                charIndex++;
                setTimeout(typeCommand, 60 + Math.random() * 40);
            } else {
                // Command fully typed, delay and show output
                setTimeout(() => {
                    outputDiv.textContent = script.output;
                    
                    // Delay before starting the next script
                    setTimeout(() => {
                        scriptIndex = (scriptIndex + 1) % terminalScripts.length;
                        runScript();
                    }, 4000);
                }, 400);
            }
        }
        
        setTimeout(typeCommand, 800);
    }

    runScript();
}

function initTerminalCopyButtons() {
    const terminalBlocks = document.querySelectorAll(".terminal-block");
    terminalBlocks.forEach((block) => {
        const header = block.querySelector(".terminal-header");
        const body = block.querySelector(".terminal-body");
        if (!header || !body || header.querySelector(".terminal-copy")) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "terminal-copy";
        button.textContent = "Copy";
        button.setAttribute("aria-label", "Copy terminal commands");

        button.addEventListener("click", async () => {
            const commandLines = Array.from(body.querySelectorAll(".terminal-cmd"))
                .map((item) => item.textContent?.trimEnd() ?? "")
                .filter(Boolean);
            const text = commandLines.length > 0 ? commandLines.join("\n") : body.textContent.trim();

            try {
                await copyText(text);
                button.textContent = "Copied";
                setTimeout(() => {
                    button.textContent = "Copy";
                }, 1600);
            } catch {
                button.textContent = "Failed";
                setTimeout(() => {
                    button.textContent = "Copy";
                }, 1600);
            }
        });

        header.appendChild(button);
    });
}

async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
}

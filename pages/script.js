/**
 * WINNEST OFFICIAL WEB PORTAL — SCRIPT SYSTEM
 * Implements typewriter animations, scroll reveal, and interactive terminal simulation.
 */

document.addEventListener("DOMContentLoaded", () => {
    initTypewriter("typing-name", "WinNest", 120);
    initScrollReveal();
    initTerminalSimulation();
});

/**
 * Creates a natural, custom typewriter effect with a blinking cursor.
 */
function initTypewriter(elementId, textToType, speed = 80) {
    const container = document.getElementById(elementId);
    if (!container) return;

    container.textContent = "";

    const textSpan = document.createElement("span");
    container.appendChild(textSpan);

    const cursorSpan = document.createElement("span");
    cursorSpan.className = "terminal-cursor";
    cursorSpan.textContent = "▋";
    container.appendChild(cursorSpan);

    let charIndex = 0;

    function type() {
        if (charIndex < textToType.length) {
            textSpan.textContent += textToType.charAt(charIndex);
            charIndex++;
            const randomizedDelay = speed + (Math.random() * 40 - 20);
            setTimeout(type, randomizedDelay);
        } else {
            setTimeout(() => {
                cursorSpan.style.transition = "opacity 0.3s ease";
                cursorSpan.style.opacity = "0";
                setTimeout(() => cursorSpan.remove(), 300);
            }, 800);
        }
    }

    setTimeout(type, 300);
}

/**
 * Initializes the IntersectionObserver for entry animations.
 */
function initScrollReveal() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealElements = document.querySelectorAll(".scroll-reveal");
    
    if (prefersReducedMotion) {
        revealElements.forEach(el => {
            el.classList.add("reveal-active");
        });
        return;
    }
    
    const observerOptions = {
        root: null,
        rootMargin: "0px 0px -6% 0px",
        threshold: 0.05
    };
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("reveal-active");
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
}

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

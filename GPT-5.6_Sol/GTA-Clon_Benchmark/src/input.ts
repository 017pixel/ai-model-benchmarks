export type Control = "throttle" | "brake" | "left" | "right" | "handbrake";

export class Input {
  private readonly active = new Set<Control>();
  private cameraRequested = false;

  constructor() {
    const mapping: Record<string, Control> = {
      KeyW: "throttle",
      ArrowUp: "throttle",
      KeyS: "brake",
      ArrowDown: "brake",
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
      Space: "handbrake",
    };

    window.addEventListener("keydown", (event) => {
      if (mapping[event.code]) {
        event.preventDefault();
        this.active.add(mapping[event.code]);
      }
      if (event.code === "KeyC" && !event.repeat) this.cameraRequested = true;
    });

    window.addEventListener("keyup", (event) => {
      if (mapping[event.code]) this.active.delete(mapping[event.code]);
    });

    window.addEventListener("blur", () => this.active.clear());

    document.querySelectorAll<HTMLButtonElement>("[data-control]").forEach((button) => {
      const control = button.dataset.control as Control;
      const start = (event: PointerEvent) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        button.classList.add("is-active");
        this.active.add(control);
      };
      const stop = (event: PointerEvent) => {
        event.preventDefault();
        button.classList.remove("is-active");
        this.active.delete(control);
      };
      button.addEventListener("pointerdown", start);
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
    });
  }

  get(control: Control): boolean {
    return this.active.has(control);
  }

  consumeCameraRequest(): boolean {
    const requested = this.cameraRequested;
    this.cameraRequested = false;
    return requested;
  }
}

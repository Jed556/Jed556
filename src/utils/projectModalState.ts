class ProjectModalState extends EventTarget {
  private _isOpen: boolean = false;

  public get isOpen(): boolean {
    return this._isOpen;
  }

  public setOpen(open: boolean) {
    if (this._isOpen !== open) {
      this._isOpen = open;
      this.dispatchEvent(new CustomEvent('change', { detail: { isOpen: open } }));
    }
  }
}

export const projectModalState = new ProjectModalState();

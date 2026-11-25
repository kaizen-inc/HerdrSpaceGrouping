import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { closeOverlay, props, setShared, shared, spaces, theme } from "herdr";
import { assign, listGroups, renameGroup, sections, storageKey } from "./groups.js";

const machineOf = space => space.machine ?? null;
const groupLabel = name => name === "Ungrouped" ? "Ungrouped (named group)" : name;

export default class GroupPicker extends View {
  init(_props, cx) {
    this.input = InputState.new({ value: "" });
    this.input.on("submit", (_event, cx) => props()?.id ? this.create() : this.saveRename(cx));
    if (props()?.id) {
      this.input.focus();
      cx.timer.after(600, () => this.input.focus());
    }
  }

  space() {
    return spaces().find(space => space.id === props()?.id);
  }

  move(name) {
    const space = this.space();
    if (space) setShared(storageKey, assign(shared(storageKey), space, name));
    closeOverlay(props()?.overlay);
  }

  create() {
    const name = this.input.value().trim();
    if (name) this.move(name);
  }

  saveRename(cx) {
    if (!this.editing) return;
    const { machine, name } = this.editing;
    const result = renameGroup(shared(storageKey), machine, name, this.input.value());
    this.error = result.error;
    if (!result.error) {
      this.editing = null;
      setShared(storageKey, result.state);
    }
    cx.notify();
  }

  render() {
    const t = theme();
    const state = shared(storageKey);
    const saved = listGroups(state);
    const choice = (id, text, action, selected = false) => h_flex().id(id).h(30).flex_none().px(9)
      .items_center().rounded(5).cursor_pointer().when(selected, el => el.bg(t.selected))
      .hover(s => s.bg(t.hover)).focus(s => s.bg(t.selected)).tab_index(0)
      .on_click(action).on_key_down((event, cx) => {
        if (event.key === "enter" || event.key === "space") { cx.stop_propagation(); action(event, cx); }
      })
      .child(div().min_w(0).truncate().child(text));
    const close = () => closeOverlay(props()?.overlay);
    const heading = title => div().flex_none().text_size(15).font_semibold().truncate().child(title);
    const field = () => Input.new(this.input).tab_index(0).h(32).px(9).rounded(6).border_1().border_color(t.input).bg(t.background).text_color(t.foreground);
    const panel = v_flex().w_full().min_h(0).p(14).gap(7).bg(t.popover).text_size(13).text_color(t.foreground);
    if (!props()?.id) {
      return panel.child(heading("Space Group Settings"))
        .when(!saved.length, el => el.child(div().text_color(t.dim).child("No saved groups. Right-click a space to create one.")))
        .when(saved.length > 0, el => el.child(v_flex().flex_none().h(Math.min(220, saved.reduce((height, entry) => height + 26 + 30 * entry.names.length, 0))).overflow_y_scrollbar()
          .children(saved.flatMap(({ machine, names }) => [
            h_flex().h(26).flex_none().px(9).items_center().text_color(t.dim).child(machine ?? "This computer"),
            ...names.map(name => choice(`rename-${JSON.stringify([machine, name])}`, `${groupLabel(name)} · Rename`, (_e, cx) => {
              this.editing = { machine, name };
              this.error = null;
              this.input.set_value(name);
              cx.notify();
              cx.timer.after(30, () => {
                this.input.focus();
                this.input.set_selected_range({ start: 0, end: name.length });
              });
            }, this.editing?.machine === machine && this.editing.name === name)),
          ]))))
        .when(Boolean(this.editing), el => el
          .child(div().flex_none().text_color(t.dim).child(`Rename ${this.editing.name}`))
          .child(field())
          .when(Boolean(this.error), el => el.child(div().flex_none().text_color(t.blocked).child(this.error)))
          .child(choice("save-name", "Save name", (_e, cx) => this.saveRename(cx))))
        .child(choice("close-settings", "Close", close));
    }
    const space = this.space();
    const machine = space ? machineOf(space) : null;
    const names = saved.find(entry => entry.machine === machine)?.names ?? [];
    const current = space ? sections(state, machine, [{ w: space }]).groups[0]?.name : null;
    return panel
      .child(heading(space ? `Move ${space.name} to group` : "Space unavailable"))
      .when(Boolean(space), el => el
        .child(choice("ungrouped", "Ungrouped", () => this.move(null), !current))
        .when(names.length > 0, el => el.child(v_flex().flex_none().h(Math.min(180, 30 * names.length)).overflow_y_scrollbar()
          .children(names.map(name => choice(`group-${name}`, groupLabel(name), () => this.move(name), current === name)))))
        .child(div().flex_none().text_color(t.dim).child("New group name"))
        .child(field())
        .child(choice("create-group", "Create group and move space", () => this.create())))
      .child(choice("cancel", "Cancel", close));
  }
}

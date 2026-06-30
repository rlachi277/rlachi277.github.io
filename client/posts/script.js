import { $ } from "../query.js";
import { setupDialog } from "./dialog.js";
import { startEdit } from "./edit.js";
let isMobile = false;
const navDetails = $("nav details");
const menubar = $("#menubar");
function onResize() {
    if (window.matchMedia("(max-width: 480px)").matches) {
        if (isMobile)
            return;
        isMobile = true;
        navDetails.attr("open", null);
        menubar.css("display", "none");
    }
    else {
        if (!isMobile)
            return;
        isMobile = false;
        navDetails.attr("open", "");
        menubar.css("display", "");
    }
}
function setupMenu(menu) {
    if (menu === null)
        return;
    for (const [k, v] of Object.entries(menu)) {
        $(`[data-menu="${k}"]`).on("click", v);
    }
}
export const SERI_HOOKS = [];
export const DESERI_HOOKS = [];
export function setup(defaultMenu, editMenu = null, noEdit = false) {
    onResize();
    window.addEventListener('resize', onResize);
    const scrollY = sessionStorage.getItem('scrollY');
    if (scrollY !== null) {
        window.scrollTo(0, parseInt(scrollY));
        sessionStorage.removeItem('scrollY');
    }
    setupDialog();
    $(".menu-action").on("click", function () {
        const pparent = this.parentElement?.parentElement;
        if (pparent != undefined && pparent.matches(":popover-open"))
            pparent.hidePopover();
    });
    setupMenu(defaultMenu);
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit")) {
        if (!noEdit && !$(":root.notfound").exists)
            startEdit($("body").list[0], true);
        $("menu .menu-edit").css("display", "revert");
        $("nav a").each((e) => {
            e.setAttribute("href", e.getAttribute("href") + "?edit=t");
        });
        setupMenu(editMenu);
    }
}

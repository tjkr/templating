import {Binding} from 'aurelia-binding';
import {Container} from 'aurelia-dependency-injection';

//NOTE: Adding a fragment to the document causes the nodes to be removed from the fragment.
//NOTE: Adding to the fragment, causes the nodes to be removed from the document.

interface ViewNode {
  bind(bindingContext: Object, systemUpdate?: boolean): void;
  attached(): void;
  detached(): void;
  unbind(): void;
}

export class View {
  constructor(viewFactory: ViewFactory, container: Container, fragment: DocumentFragment, controllers: Controller[], bindings: Binding[], children: ViewNode[], systemControlled: boolean, contentSelectors: ContentSelector[]) {
    this.viewFactory = viewFactory;
    this.container = container;
    this.fragment = fragment;
    this.controllers = controllers;
    this.bindings = bindings;
    this.children = children;
    this.systemControlled = systemControlled;
    this.contentSelectors = contentSelectors;
    this.firstChild = fragment.firstChild;
    this.lastChild = fragment.lastChild;
    this.isBound = false;
    this.isAttached = false;
    this.fromCache = false;
  }

  returnToCache(): void {
    this.viewFactory.returnViewToCache(this);
  }

  created(): void {
    let i;
    let ii;
    let controllers = this.controllers;

    for (i = 0, ii = controllers.length; i < ii; ++i) {
      controllers[i].created(this);
    }
  }

  bind(bindingContext: Object, systemUpdate?: boolean): void {
    let context;
    let controllers;
    let bindings;
    let children;
    let i;
    let ii;

    if (systemUpdate && !this.systemControlled) {
      context = this.bindingContext || bindingContext;
    } else {
      context = bindingContext || this.bindingContext;
    }

    if (this.isBound) {
      if (this.bindingContext === context) {
        return;
      }

      this.unbind();
    }

    this.isBound = true;
    this.bindingContext = context;

    if (this.owner) {
      this.owner.bind(context);
    }

    bindings = this.bindings;
    for (i = 0, ii = bindings.length; i < ii; ++i) {
      bindings[i].bind(context);
    }

    controllers = this.controllers;
    for (i = 0, ii = controllers.length; i < ii; ++i) {
      controllers[i].bind(context);
    }

    children = this.children;
    for (i = 0, ii = children.length; i < ii; ++i) {
      children[i].bind(context, true);
    }
  }

  addBinding(binding: Binding): void {
    this.bindings.push(binding);

    if (this.isBound) {
      binding.bind(this.bindingContext);
    }
  }

  unbind(): void {
    let controllers;
    let bindings;
    let children;
    let i;
    let ii;

    if (this.isBound) {
      this.isBound = false;
      this.bindingContext = null;

      if (this.owner) {
        this.owner.unbind();
      }

      bindings = this.bindings;
      for (i = 0, ii = bindings.length; i < ii; ++i) {
        bindings[i].unbind();
      }

      controllers = this.controllers;
      for (i = 0, ii = controllers.length; i < ii; ++i) {
        controllers[i].unbind();
      }

      children = this.children;
      for (i = 0, ii = children.length; i < ii; ++i) {
        children[i].unbind();
      }
    }
  }

  insertNodesBefore(refNode: Node): void {
    let parent = refNode.parentNode;
    parent.insertBefore(this.fragment, refNode);
  }

  appendNodesTo(parent: Element): void {
    parent.appendChild(this.fragment);
  }

  removeNodes(): void {
    let start = this.firstChild;
    let end = this.lastChild;
    let fragment = this.fragment;
    let next;
    let current = start;
    let loop = true;

    while (loop) {
      if (current === end) {
        loop = false;
      }

      next = current.nextSibling;
      fragment.appendChild(current);
      current = next;
    }
  }

  attached(): void {
    let controllers;
    let children;
    let i;
    let ii;

    if (this.isAttached) {
      return;
    }

    this.isAttached = true;

    if (this.owner) {
      this.owner.attached();
    }

    controllers = this.controllers;
    for (i = 0, ii = controllers.length; i < ii; ++i) {
      controllers[i].attached();
    }

    children = this.children;
    for (i = 0, ii = children.length; i < ii; ++i) {
      children[i].attached();
    }
  }

  detached(): void {
    let controllers;
    let children;
    let i;
    let ii;

    if (this.isAttached) {
      this.isAttached = false;

      if (this.owner) {
        this.owner.detached();
      }

      controllers = this.controllers;
      for (i = 0, ii = controllers.length; i < ii; ++i) {
        controllers[i].detached();
      }

      children = this.children;
      for (i = 0, ii = children.length; i < ii; ++i) {
        children[i].detached();
      }
    }
  }
}

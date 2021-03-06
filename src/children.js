import {DOM} from 'aurelia-pal';

const noMutations = [];

export class ChildObserver {
  constructor(config) {
    this.name = config.name;
    this.changeHandler = config.changeHandler || this.name + 'Changed';
    this.selector = config.selector;
  }

  create(target, behavior) {
    return new ChildObserverBinder(this.selector, target, this.name, behavior, this.changeHandler);
  }
}

//TODO: we really only want one child observer per element. Right now you can have many, via @sync.
//We need to enable a way to share the observer across all uses and direct matches to the correct source.
export class ChildObserverBinder {
  constructor(selector, target, property, behavior, changeHandler) {
    this.selector = selector;
    this.target = target;
    this.property = property;
    this.behavior = behavior;
    this.changeHandler = changeHandler in behavior ? changeHandler : null;
    this.observer = DOM.createMutationObserver(this.onChange.bind(this));
  }

  bind(source) {
    let items;
    let results;
    let i;
    let ii;
    let node;
    let behavior = this.behavior;

    this.observer.observe(this.target, {childList: true, subtree: true});

    items = behavior[this.property];
    if (!items) {
      items = behavior[this.property] = [];
    } else {
      items.length = 0;
    }

    results = this.target.querySelectorAll(this.selector);

    for (i = 0, ii = results.length; i < ii; ++i) {
      node = results[i];
      items.push(node.au && node.au.controller ? node.au.controller.model : node);
    }

    if (this.changeHandler !== null) {
      this.behavior[this.changeHandler](noMutations);
    }
  }

  unbind() {
    this.observer.disconnect();
  }

  onChange(mutations) {
    let items = this.behavior[this.property];
    let selector = this.selector;

    mutations.forEach(record => {
      let added = record.addedNodes;
      let removed = record.removedNodes;
      let prev = record.previousSibling;
      let i;
      let ii;
      let primary;
      let index;
      let node;

      for (i = 0, ii = removed.length; i < ii; ++i) {
        node = removed[i];
        if (node.nodeType === 1 && node.matches(selector)) {
          primary = node.au && node.au.controller ? node.au.controller.model : node;
          index = items.indexOf(primary);
          if (index !== -1) {
            items.splice(index, 1);
          }
        }
      }

      for (i = 0, ii = added.length; i < ii; ++i) {
        node = added[i];
        if (node.nodeType === 1 && node.matches(selector)) {
          primary = node.au && node.au.controller ? node.au.controller.model : node;
          index = 0;

          while (prev) {
            if (prev.nodeType === 1 && prev.matches(selector)) {
              index++;
            }

            prev = prev.previousSibling;
          }

          items.splice(index, 0, primary);
        }
      }
    });

    if (this.changeHandler !== null) {
      this.behavior[this.changeHandler](mutations);
    }
  }
}

import 'core-js';
import * as LogManager from 'aurelia-logging';
import {metadata,Origin,decorators} from 'aurelia-metadata';
import {relativeToFile} from 'aurelia-path';
import {TemplateRegistryEntry,Loader} from 'aurelia-loader';
import {DOM,PLATFORM,FEATURE} from 'aurelia-pal';
import {ValueConverter,Binding,ValueConverterResource,subscriberCollection,bindingMode,ObserverLocator,BindingExpression,EventManager,bindingEngine} from 'aurelia-binding';
import {Container,inject} from 'aurelia-dependency-injection';
import {TaskQueue} from 'aurelia-task-queue';

export const animationEvent = {
  enterBegin: 'animation:enter:begin',
  enterActive: 'animation:enter:active',
  enterDone: 'animation:enter:done',
  enterTimeout: 'animation:enter:timeout',

  leaveBegin: 'animation:leave:begin',
  leaveActive: 'animation:leave:active',
  leaveDone: 'animation:leave:done',
  leaveTimeout: 'animation:leave:timeout',

  staggerNext: 'animation:stagger:next',

  removeClassBegin: 'animation:remove-class:begin',
  removeClassActive: 'animation:remove-class:active',
  removeClassDone: 'animation:remove-class:done',
  removeClassTimeout: 'animation:remove-class:timeout',

  addClassBegin: 'animation:add-class:begin',
  addClassActive: 'animation:add-class:active',
  addClassDone: 'animation:add-class:done',
  addClassTimeout: 'animation:add-class:timeout',

  animateBegin: 'animation:animate:begin',
  animateActive: 'animation:animate:active',
  animateDone: 'animation:animate:done',
  animateTimeout: 'animation:animate:timeout',

  sequenceBegin: 'animation:sequence:begin',
  sequenceDone: 'animation:sequence:done'
};

export class Animator {
  static configureDefault(container, animatorInstance) {
    container.registerInstance(Animator, Animator.instance = (animatorInstance || new Animator()));
  }

  move() {
    return Promise.resolve(false);
  }

  /**
   * Execute an 'enter' animation on an element
   *
   * @param element {HTMLElement}         Element to animate
   *
   * @returns {Promise}                   Resolved when the animation is done
   */
  enter(element) {
    return Promise.resolve(false);
  }

  /**
   * Execute a 'leave' animation on an element
   *
   * @param element {HTMLElement}         Element to animate
   *
   * @returns {Promise}                   Resolved when the animation is done
   */
  leave(element) {
    return Promise.resolve(false);
  }

  /**
   * Add a class to an element to trigger an animation.
   *
   * @param element {HTMLElement}         Element to animate
   * @param className {String}            Properties to animate or name of the effect to use
   *
   * @returns {Promise}                   Resolved when the animation is done
   */
  removeClass(element, className) {
    element.classList.remove(className);
    return Promise.resolve(false);
  }

  /**
   * Add a class to an element to trigger an animation.
   *
   * @param element {HTMLElement}         Element to animate
   * @param className {String}            Properties to animate or name of the effect to use
   *
   * @returns {Promise}                   Resolved when the animation is done
   */
  addClass(element, className) {
    element.classList.add(className);
    return Promise.resolve(false);
  }

  /**
   * Execute a single animation.
   *
   * @param element {HTMLElement}         Element to animate
   * @param className {Object|String}    Properties to animate or name of the effect to use
   *                                      For css animators this represents the className to
   *                                      be added and removed right after the animation is done
   * @param options {Object}              options for the animation (duration, easing, ...)
   *
   * @returns {Promise}                   Resolved when the animation is done
   */
  animate(element, className, options) {
    return Promise.resolve(false);
  }

  /**
   * Run a sequence of animations one after the other.
   * for example : animator.runSequence("fadeIn","callout")
   *
   * @param sequence {Array}          An array of effectNames or classNames
   *
   * @returns {Promise}               Resolved when all animations are done
   */
  runSequence(sequence) {}

  /**
   * Register an effect (for JS based animators)
   *
   * @param effectName {String}          name identifier of the effect
   * @param properties {Object}          Object with properties for the effect
   *
   */
  registerEffect(effectName, properties) {}

  /**
   * Unregister an effect (for JS based animators)
   *
   * @param effectName {String}          name identifier of the effect
   */
  unregisterEffect(effectName) {}
}

const capitalMatcher = /([A-Z])/g;

function addHyphenAndLower(char) {
  return '-' + char.toLowerCase();
}

export function hyphenate(name) {
  return (name.charAt(0).toLowerCase() + name.slice(1)).replace(capitalMatcher, addHyphenAndLower);
}

export class ResourceLoadContext {
  constructor() {
    this.dependencies = {};
  }

  addDependency(url: string): void {
    this.dependencies[url] = true;
  }

  doesNotHaveDependency(url: string): boolean {
    return !(url in this.dependencies);
  }
}

export class ViewCompileInstruction {
  static normal = new ViewCompileInstruction();

  constructor(targetShadowDOM?: boolean = false, compileSurrogate?: boolean = false) {
    this.targetShadowDOM = targetShadowDOM;
    this.compileSurrogate = compileSurrogate;
    this.associatedModuleId = null;
  }
}

interface ViewCreateInstruction {
  suppressBind?: boolean;
  systemControlled?: boolean;
  enhance?: boolean;
  partReplacements?: Object;
  initiatedByBehavior?: boolean;
}

export class BehaviorInstruction {
  static normal = new BehaviorInstruction();
  static contentSelector = new BehaviorInstruction(true);

  static element(node: Node, type: HtmlBehaviorResource): BehaviorInstruction {
    let instruction = new BehaviorInstruction(true);
    instruction.type = type;
    instruction.attributes = {};
    instruction.anchorIsContainer = !(node.hasAttribute('containerless') || type.containerless);
    instruction.initiatedByBehavior = true;
    return instruction;
  }

  static attribute(attrName: string, type?: HtmlBehaviorResource): BehaviorInstruction {
    let instruction = new BehaviorInstruction(true);
    instruction.attrName = attrName;
    instruction.type = type || null;
    instruction.attributes = {};
    return instruction;
  }

  static dynamic(host, bindingContext, viewFactory) {
    let instruction = new BehaviorInstruction(true);
    instruction.host = host;
    instruction.bindingContext = bindingContext;
    instruction.viewFactory = viewFactory;
    return instruction;
  }

  constructor(suppressBind?: boolean = false) {
    this.suppressBind = suppressBind;
    this.initiatedByBehavior = false;
    this.systemControlled = false;
    this.enhance = false;
    this.partReplacements = null;
    this.viewFactory = null;
    this.originalAttrName = null;
    this.skipContentProcessing = false;
    this.contentFactory = null;
    this.bindingContext = null;
    this.anchorIsContainer = false;
    this.host = null;
    this.attributes = null;
    this.type = null;
    this.attrName = null;
  }
}

export class TargetInstruction {
  static noExpressions = Object.freeze([]);

  static contentSelector(node: Node, parentInjectorId: number): TargetInstruction {
    let instruction = new TargetInstruction();
    instruction.parentInjectorId = parentInjectorId;
    instruction.contentSelector = true;
    instruction.selector = node.getAttribute('select');
    instruction.suppressBind = true;
    return instruction;
  }

  static contentExpression(expression): TargetInstruction {
    let instruction = new TargetInstruction();
    instruction.contentExpression = expression;
    return instruction;
  }

  static lifting(parentInjectorId: number, liftingInstruction: BehaviorInstruction): TargetInstruction {
    let instruction = new TargetInstruction();
    instruction.parentInjectorId = parentInjectorId;
    instruction.expressions = TargetInstruction.noExpressions;
    instruction.behaviorInstructions = [liftingInstruction];
    instruction.viewFactory = liftingInstruction.viewFactory;
    instruction.providers = [liftingInstruction.type.target];
    return instruction;
  }

  static normal(injectorId, parentInjectorId, providers, behaviorInstructions, expressions, elementInstruction): TargetInstruction {
    let instruction = new TargetInstruction();
    instruction.injectorId = injectorId;
    instruction.parentInjectorId = parentInjectorId;
    instruction.providers = providers;
    instruction.behaviorInstructions = behaviorInstructions;
    instruction.expressions = expressions;
    instruction.anchorIsContainer = elementInstruction ? elementInstruction.anchorIsContainer : true;
    instruction.elementInstruction = elementInstruction;
    return instruction;
  }

  static surrogate(providers, behaviorInstructions, expressions, values): TargetInstruction {
    let instruction = new TargetInstruction();
    instruction.expressions = expressions;
    instruction.behaviorInstructions = behaviorInstructions;
    instruction.providers = providers;
    instruction.values = values;
    return instruction;
  }

  constructor() {
    this.injectorId = null;
    this.parentInjectorId = null;

    this.contentSelector = false;
    this.selector = null;
    this.suppressBind = false;

    this.contentExpression = null;

    this.expressions = null;
    this.behaviorInstructions = null;
    this.providers = null;

    this.viewFactory = null;

    this.anchorIsContainer = false;
    this.elementInstruction = null;

    this.values = null;
  }
}

export class ViewStrategy {
  static metadataKey: string = 'aurelia:view-strategy';

  makeRelativeTo(baseUrl: string): void {}

  static normalize(value: string|ViewStrategy): ViewStrategy {
    if (typeof value === 'string') {
      value = new UseViewStrategy(value);
    }

    if (value && !(value instanceof ViewStrategy)) {
      throw new Error('The view must be a string or an instance of ViewStrategy.');
    }

    return value;
  }

  static getDefault(target: any): ViewStrategy {
    let strategy;
    let annotation;

    if (typeof target !== 'function') {
      target = target.constructor;
    }

    annotation = Origin.get(target);
    strategy = metadata.get(ViewStrategy.metadataKey, target);

    if (!strategy) {
      if (!annotation) {
        throw new Error('Cannot determinte default view strategy for object.', target);
      }

      strategy = new ConventionalViewStrategy(annotation.moduleId);
    } else if (annotation) {
      strategy.moduleId = annotation.moduleId;
    }

    return strategy;
  }
}

export class UseViewStrategy extends ViewStrategy {
  constructor(path: string) {
    super();
    this.path = path;
  }

  loadViewFactory(viewEngine: ViewEngine, compileInstruction: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewFactory> {
    if (!this.absolutePath && this.moduleId) {
      this.absolutePath = relativeToFile(this.path, this.moduleId);
    }

    compileInstruction.associatedModuleId = this.moduleId;
    return viewEngine.loadViewFactory(this.absolutePath || this.path, compileInstruction, loadContext);
  }

  makeRelativeTo(file: string): void {
    this.absolutePath = relativeToFile(this.path, file);
  }
}

export class ConventionalViewStrategy extends ViewStrategy {
  constructor(moduleId: string) {
    super();
    this.moduleId = moduleId;
    this.viewUrl = ConventionalViewStrategy.convertModuleIdToViewUrl(moduleId);
  }

  loadViewFactory(viewEngine: ViewEngine, compileInstruction: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewFactory> {
    compileInstruction.associatedModuleId = this.moduleId;
    return viewEngine.loadViewFactory(this.viewUrl, compileInstruction, loadContext);
  }

  static convertModuleIdToViewUrl(moduleId: string): string {
    let id = (moduleId.endsWith('.js') || moduleId.endsWith('.ts')) ? moduleId.substring(0, moduleId.length - 3) : moduleId;
    return id + '.html';
  }
}

export class NoViewStrategy extends ViewStrategy {
  loadViewFactory(viewEngine: ViewEngine, compileInstruction: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewFactory> {
    return Promise.resolve(null);
  }
}

export class TemplateRegistryViewStrategy extends ViewStrategy {
  constructor(moduleId: string, entry: TemplateRegistryEntry) {
    super();
    this.moduleId = moduleId;
    this.entry = entry;
  }

  loadViewFactory(viewEngine: ViewEngine, compileInstruction: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewFactory> {
    let entry = this.entry;

    if (entry.isReady) {
      return Promise.resolve(entry.factory);
    }

    compileInstruction.associatedModuleId = this.moduleId;
    return viewEngine.loadViewFactory(entry, compileInstruction, loadContext);
  }
}

export class InlineViewStrategy extends ViewStrategy {
  constructor(markup: string, dependencies?: Array<string|Function|Object>, dependencyBaseUrl?: string) {
    super();
    this.markup = markup;
    this.dependencies = dependencies || null;
    this.dependencyBaseUrl = dependencyBaseUrl || '';
  }

  loadViewFactory(viewEngine: ViewEngine, compileInstruction: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewFactory> {
    let entry = this.entry;
    let dependencies = this.dependencies;

    if (entry && entry.isReady) {
      return Promise.resolve(entry.factory);
    }

    this.entry = entry = new TemplateRegistryEntry(this.moduleId || this.dependencyBaseUrl);
    entry.setTemplate(DOM.createTemplateFromMarkup(this.markup));

    if (dependencies !== null) {
      for (let i = 0, ii = dependencies.length; i < ii; ++i) {
        let current = dependencies[i];

        if (typeof current === 'string' || typeof current === 'function') {
          entry.addDependency(current);
        } else {
          entry.addDependency(current.from, current.as);
        }
      }
    }

    compileInstruction.associatedModuleId = this.moduleId;
    return viewEngine.loadViewFactory(entry, compileInstruction, loadContext);
  }
}

export class BindingLanguage {
  inspectAttribute(resources, attrName, attrValue) {
    throw new Error('A BindingLanguage must implement inspectAttribute(...)');
  }

  createAttributeInstruction(resources, element, info, existingInstruction) {
    throw new Error('A BindingLanguage must implement createAttributeInstruction(...)');
  }

  parseText(resources, value) {
    throw new Error('A BindingLanguage must implement parseText(...)');
  }
}

function register(lookup, name, resource, type) {
  if (!name) {
    return;
  }

  let existing = lookup[name];
  if (existing) {
    if (existing !== resource) {
      throw new Error(`Attempted to register ${type} when one with the same name already exists. Name: ${name}.`);
    }

    return;
  }

  lookup[name] = resource;
}

interface ViewEngineHooks {
  beforeCompile?: (content: DocumentFragment, resources: ViewResources, instruction: ViewCompileInstruction) => void;
  afterCompile?: (viewFactory: ViewFactory) => void;
  beforeCreate?: (viewFactory: ViewFactory, container: Container, content: DocumentFragment, instruction: ViewCreateInstruction, bindingContext?:Object) => void;
  afterCreate?: (view: View) => void;
}

export class ViewResources {
  constructor(parent?: ViewResources, viewUrl?: string) {
    this.parent = parent || null;
    this.hasParent = this.parent !== null;
    this.viewUrl = viewUrl || '';
    this.valueConverterLookupFunction = this.getValueConverter.bind(this);
    this.attributes = {};
    this.elements = {};
    this.valueConverters = {};
    this.attributeMap = {};
    this.bindingLanguage = null;
    this.hook1 = null;
    this.hook2 = null;
    this.hook3 = null;
    this.additionalHooks = null;
  }

  onBeforeCompile(content: DocumentFragment, resources: ViewResources, instruction: ViewCompileInstruction): void {
    if (this.hasParent) {
      this.parent.onBeforeCompile(content, resources, instruction);
    }

    if (this.hook1 !== null) {
      this.hook1.beforeCompile(content, resources, instruction);

      if (this.hook2 !== null) {
        this.hook2.beforeCompile(content, resources, instruction);

        if (this.hook3 !== null) {
          this.hook3.beforeCompile(content, resources, instruction);

          if (this.additionalHooks !== null) {
            let hooks = this.additionalHooks;
            for (let i = 0, length = hooks.length; i < length; ++i) {
              hooks[i].beforeCompile(content, resources, instruction);
            }
          }
        }
      }
    }
  }

  onAfterCompile(viewFactory: ViewFactory): void {
    if (this.hasParent) {
      this.parent.onAfterCompile(viewFactory);
    }

    if (this.hook1 !== null) {
      this.hook1.afterCompile(viewFactory);

      if (this.hook2 !== null) {
        this.hook2.afterCompile(viewFactory);

        if (this.hook3 !== null) {
          this.hook3.afterCompile(viewFactory);

          if (this.additionalHooks !== null) {
            let hooks = this.additionalHooks;
            for (let i = 0, length = hooks.length; i < length; ++i) {
              hooks[i].afterCompile(viewFactory);
            }
          }
        }
      }
    }
  }

  onBeforeCreate(viewFactory: ViewFactory, container: Container, content: DocumentFragment, instruction: ViewCreateInstruction, bindingContext?:Object): void {
    if (this.hasParent) {
      this.parent.onBeforeCreate(viewFactory, container, content, instruction, bindingContext);
    }

    if (this.hook1 !== null) {
      this.hook1.beforeCreate(viewFactory, container, content, instruction, bindingContext);

      if (this.hook2 !== null) {
        this.hook2.beforeCreate(viewFactory, container, content, instruction, bindingContext);

        if (this.hook3 !== null) {
          this.hook3.beforeCreate(viewFactory, container, content, instruction, bindingContext);

          if (this.additionalHooks !== null) {
            let hooks = this.additionalHooks;
            for (let i = 0, length = hooks.length; i < length; ++i) {
              hooks[i].beforeCreate(viewFactory, container, content, instruction, bindingContext);
            }
          }
        }
      }
    }
  }

  onAfterCreate(view: View): void {
    if (this.hasParent) {
      this.parent.onAfterCreate(view);
    }

    if (this.hook1 !== null) {
      this.hook1.afterCreate(view);

      if (this.hook2 !== null) {
        this.hook2.afterCreate(view);

        if (this.hook3 !== null) {
          this.hook3.afterCreate(view);

          if (this.additionalHooks !== null) {
            let hooks = this.additionalHooks;
            for (let i = 0, length = hooks.length; i < length; ++i) {
              hooks[i].afterCreate(view);
            }
          }
        }
      }
    }
  }

  registerViewEngineHooks(hooks:ViewEngineHooks): void {
    if (hooks.beforeCompile === undefined) hooks.beforeCompile = PLATFORM.noop;
    if (hooks.afterCompile === undefined) hooks.afterCompile = PLATFORM.noop;
    if (hooks.beforeCreate === undefined) hooks.beforeCreate = PLATFORM.noop;
    if (hooks.afterCreate === undefined) hooks.afterCreate = PLATFORM.noop;

    if (this.hook1 === null) this.hook1 = hooks;
    else if (this.hook2 === null) this.hook2 = hooks;
    else if (this.hook3 === null) this.hook3 = hooks;
    else {
      if (this.additionalHooks === null) {
        this.additionalHooks = [];
      }

      this.additionalHooks.push(hooks);
    }
  }

  getBindingLanguage(bindingLanguageFallback: BindingLanguage): BindingLanguage {
    return this.bindingLanguage || (this.bindingLanguage = bindingLanguageFallback);
  }

  patchInParent(newParent: ViewResources): void {
    let originalParent = this.parent;

    this.parent = newParent || null;
    this.hasParent = this.parent !== null;

    if (newParent.parent === null) {
      newParent.parent = originalParent;
      newParent.hasParent = originalParent !== null;
    }
  }

  relativeToView(path: string): string {
    return relativeToFile(path, this.viewUrl);
  }

  registerElement(tagName: string, behavior: HtmlBehaviorResource): void {
    register(this.elements, tagName, behavior, 'an Element');
  }

  getElement(tagName: string): HtmlBehaviorResource {
    return this.elements[tagName] || (this.hasParent ? this.parent.getElement(tagName) : null);
  }

  mapAttribute(attribute: string): string {
    return this.attributeMap[attribute] || (this.hasParent ? this.parent.mapAttribute(attribute) : null);
  }

  registerAttribute(attribute: string, behavior: HtmlBehaviorResource, knownAttribute: string): void {
    this.attributeMap[attribute] = knownAttribute;
    register(this.attributes, attribute, behavior, 'an Attribute');
  }

  getAttribute(attribute: string): HtmlBehaviorResource {
    return this.attributes[attribute] || (this.hasParent ? this.parent.getAttribute(attribute) : null);
  }

  registerValueConverter(name: string, valueConverter: ValueConverter): void {
    register(this.valueConverters, name, valueConverter, 'a ValueConverter');
  }

  getValueConverter(name: string): ValueConverter {
    return this.valueConverters[name] || (this.hasParent ? this.parent.getValueConverter(name) : null);
  }
}

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

let placeholder = [];

function findInsertionPoint(groups, index) {
  let insertionPoint;

  while (!insertionPoint && index >= 0) {
    insertionPoint = groups[index][0];
    index--;
  }

  return insertionPoint;
}

export class ContentSelector {
  static applySelectors(view, contentSelectors, callback) {
    let currentChild = view.fragment.firstChild;
    let contentMap = new Map();
    let nextSibling;
    let i;
    let ii;
    let contentSelector;

    while (currentChild) {
      nextSibling = currentChild.nextSibling;

      if (currentChild.viewSlot) {
        let viewSlotSelectors = contentSelectors.map(x => x.copyForViewSlot());
        currentChild.viewSlot.installContentSelectors(viewSlotSelectors);
      } else {
        for (i = 0, ii = contentSelectors.length; i < ii; i++) {
          contentSelector = contentSelectors[i];
          if (contentSelector.matches(currentChild)) {
            let elements = contentMap.get(contentSelector);
            if (!elements) {
              elements = [];
              contentMap.set(contentSelector, elements);
            }

            elements.push(currentChild);
            break;
          }
        }
      }

      currentChild = nextSibling;
    }

    for (i = 0, ii = contentSelectors.length; i < ii; ++i) {
      contentSelector = contentSelectors[i];
      callback(contentSelector, contentMap.get(contentSelector) || placeholder);
    }
  }

  constructor(anchor, selector) {
    this.anchor = anchor;
    this.selector = selector;
    this.all = !this.selector;
    this.groups = [];
  }

  copyForViewSlot() {
    return new ContentSelector(this.anchor, this.selector);
  }

  matches(node) {
    return this.all || (node.nodeType === 1 && node.matches(this.selector));
  }

  add(group) {
    let anchor = this.anchor;
    let parent = anchor.parentNode;
    let i;
    let ii;

    for (i = 0, ii = group.length; i < ii; ++i) {
      parent.insertBefore(group[i], anchor);
    }

    this.groups.push(group);
  }

  insert(index, group) {
    if (group.length) {
      let anchor = findInsertionPoint(this.groups, index) || this.anchor;
      let parent = anchor.parentNode;
      let i;
      let ii;

      for (i = 0, ii = group.length; i < ii; ++i) {
        parent.insertBefore(group[i], anchor);
      }
    }

    this.groups.splice(index, 0, group);
  }

  removeAt(index, fragment) {
    let group = this.groups[index];
    let i;
    let ii;

    for (i = 0, ii = group.length; i < ii; ++i) {
      fragment.appendChild(group[i]);
    }

    this.groups.splice(index, 1);
  }
}

function getAnimatableElement(view) {
  let firstChild = view.firstChild;

  if (firstChild !== null && firstChild !== undefined && firstChild.nodeType === 8) {
    let element = DOM.nextElementSibling(firstChild);

    if (element !== null && element !== undefined &&
      element.nodeType === 1 &&
      element.classList.contains('au-animate')) {
      return element;
    }
  }

  return null;
}

export class ViewSlot {
  constructor(anchor: Node, anchorIsContainer: boolean, bindingContext?: Object, animator?: Animator = Animator.instance) {
    this.anchor = anchor;
    this.viewAddMethod = anchorIsContainer ? 'appendNodesTo' : 'insertNodesBefore';
    this.bindingContext = bindingContext;
    this.animator = animator;
    this.children = [];
    this.isBound = false;
    this.isAttached = false;
    this.contentSelectors = null;
    anchor.viewSlot = this;
  }

  transformChildNodesIntoView(): void {
    let parent = this.anchor;

    this.children.push({
      fragment: parent,
      firstChild: parent.firstChild,
      lastChild: parent.lastChild,
      returnToCache() {},
      removeNodes() {
        let last;

        while (last = parent.lastChild) {
          parent.removeChild(last);
        }
      },
      created() {},
      bind() {},
      unbind() {},
      attached() {},
      detached() {}
    });
  }

  bind(bindingContext: Object): void {
    let i;
    let ii;
    let children;

    if (this.isBound) {
      if (this.bindingContext === bindingContext) {
        return;
      }

      this.unbind();
    }

    this.isBound = true;
    this.bindingContext = bindingContext = bindingContext || this.bindingContext;

    children = this.children;
    for (i = 0, ii = children.length; i < ii; ++i) {
      children[i].bind(bindingContext, true);
    }
  }

  unbind(): void {
    let i;
    let ii;
    let children = this.children;

    this.isBound = false;

    for (i = 0, ii = children.length; i < ii; ++i) {
      children[i].unbind();
    }
  }

  add(view: View): void {
    view[this.viewAddMethod](this.anchor);
    this.children.push(view);

    if (this.isAttached) {
      view.attached();

      let animatableElement = getAnimatableElement(view);
      if (animatableElement !== null) {
        return this.animator.enter(animatableElement);
      }
    }
  }

  insert(index: number, view: View): void | Promise<any> {
    let children = this.children;
    let length = children.length;

    if ((index === 0 && length === 0) || index >= length) {
      return this.add(view);
    }

    view.insertNodesBefore(children[index].firstChild);
    children.splice(index, 0, view);

    if (this.isAttached) {
      view.attached();

      let animatableElement = getAnimatableElement(view);
      if (animatableElement !== null) {
        return this.animator.enter(animatableElement);
      }
    }
  }

  remove(view: View, returnToCache?: boolean, skipAnimation?: boolean): void | Promise<View> {
    return this.removeAt(this.children.indexOf(view), returnToCache, skipAnimation);
  }

  removeAt(index: number, returnToCache?: boolean, skipAnimation?: boolean): void | Promise<View> {
    let view = this.children[index];

    let removeAction = () => {
      index = this.children.indexOf(view);
      view.removeNodes();
      this.children.splice(index, 1);

      if (this.isAttached) {
        view.detached();
      }

      if (returnToCache) {
        view.returnToCache();
      }

      return view;
    };

    if (!skipAnimation) {
      let animatableElement = getAnimatableElement(view);
      if (animatableElement !== null) {
        return this.animator.leave(animatableElement).then(() => removeAction());
      }
    }

    return removeAction();
  }

  removeAll(returnToCache?: boolean, skipAnimation?: boolean): void | Promise<any> {
    let children = this.children;
    let ii = children.length;
    let i;
    let rmPromises = [];

    children.forEach(child => {
      if (skipAnimation) {
        child.removeNodes();
        return;
      }

      let animatableElement = getAnimatableElement(child);
      if (animatableElement !== null) {
        rmPromises.push(this.animator.leave(animatableElement).then(() => child.removeNodes()));
      } else {
        child.removeNodes();
      }
    });

    let removeAction = () => {
      if (this.isAttached) {
        for (i = 0; i < ii; ++i) {
          children[i].detached();
        }
      }

      if (returnToCache) {
        for (i = 0; i < ii; ++i) {
          children[i].returnToCache();
        }
      }

      this.children = [];
    };

    if (rmPromises.length > 0) {
      return Promise.all(rmPromises).then(() => removeAction());
    }

    removeAction();
  }

  swap(view: View, returnToCache?: boolean): void | Promise<any> {
    let removeResponse = this.removeAll(returnToCache);

    if (removeResponse instanceof Promise) {
      return removeResponse.then(() => this.add(view));
    }

    return this.add(view);
  }

  attached(): void {
    let i;
    let ii;
    let children;
    let child;

    if (this.isAttached) {
      return;
    }

    this.isAttached = true;

    children = this.children;
    for (i = 0, ii = children.length; i < ii; ++i) {
      child = children[i];
      child.attached();

      let element = child.firstChild ? DOM.nextElementSibling(child.firstChild) : null;
      if (child.firstChild &&
        child.firstChild.nodeType === 8 &&
         element &&
         element.nodeType === 1 &&
         element.classList.contains('au-animate')) {
        this.animator.enter(element);
      }
    }
  }

  detached(): void {
    let i;
    let ii;
    let children;

    if (this.isAttached) {
      this.isAttached = false;
      children = this.children;
      for (i = 0, ii = children.length; i < ii; ++i) {
        children[i].detached();
      }
    }
  }

  installContentSelectors(contentSelectors: ContentSelector[]): void {
    this.contentSelectors = contentSelectors;
    this.add = this._contentSelectorAdd;
    this.insert = this._contentSelectorInsert;
    this.remove = this._contentSelectorRemove;
    this.removeAt = this._contentSelectorRemoveAt;
    this.removeAll = this._contentSelectorRemoveAll;
  }

  _contentSelectorAdd(view) {
    ContentSelector.applySelectors(
      view,
      this.contentSelectors,
      (contentSelector, group) => contentSelector.add(group)
      );

    this.children.push(view);

    if (this.isAttached) {
      view.attached();
    }
  }

  _contentSelectorInsert(index, view) {
    if ((index === 0 && !this.children.length) || index >= this.children.length) {
      this.add(view);
    } else {
      ContentSelector.applySelectors(
        view,
        this.contentSelectors,
        (contentSelector, group) => contentSelector.insert(index, group)
      );

      this.children.splice(index, 0, view);

      if (this.isAttached) {
        view.attached();
      }
    }
  }

  _contentSelectorRemove(view) {
    let index = this.children.indexOf(view);
    let contentSelectors = this.contentSelectors;
    let i;
    let ii;

    for (i = 0, ii = contentSelectors.length; i < ii; ++i) {
      contentSelectors[i].removeAt(index, view.fragment);
    }

    this.children.splice(index, 1);

    if (this.isAttached) {
      view.detached();
    }
  }

  _contentSelectorRemoveAt(index) {
    let view = this.children[index];
    let contentSelectors = this.contentSelectors;
    let i;
    let ii;

    for (i = 0, ii = contentSelectors.length; i < ii; ++i) {
      contentSelectors[i].removeAt(index, view.fragment);
    }

    this.children.splice(index, 1);

    if (this.isAttached) {
      view.detached();
    }

    return view;
  }

  _contentSelectorRemoveAll() {
    let children = this.children;
    let contentSelectors = this.contentSelectors;
    let ii = children.length;
    let jj = contentSelectors.length;
    let i;
    let j;
    let view;

    for (i = 0; i < ii; ++i) {
      view = children[i];

      for (j = 0; j < jj; ++j) {
        contentSelectors[j].removeAt(0, view.fragment);
      }
    }

    if (this.isAttached) {
      for (i = 0; i < ii; ++i) {
        children[i].detached();
      }
    }

    this.children = [];
  }
}

let providerResolverInstance = new (class ProviderResolver {
  get(container, key) {
    let id = key.__providerId__;
    return id in container ? container[id] : (container[id] = container.invoke(key));
  }
});

function elementContainerGet(key) {
  if (key === DOM.Element) {
    return this.element;
  }

  if (key === BoundViewFactory) {
    if (this.boundViewFactory) {
      return this.boundViewFactory;
    }

    let factory = this.instruction.viewFactory;
    let partReplacements = this.partReplacements;

    if (partReplacements) {
      factory = partReplacements[factory.part] || factory;
    }

    this.boundViewFactory = new BoundViewFactory(this, factory, this.bindingContext, partReplacements);
    return this.boundViewFactory;
  }

  if (key === ViewSlot) {
    if (this.viewSlot === undefined) {
      this.viewSlot = new ViewSlot(this.element, this.instruction.anchorIsContainer, this.bindingContext);
      this.children.push(this.viewSlot);
    }

    return this.viewSlot;
  }

  if (key === ViewResources) {
    return this.viewResources;
  }

  if (key === TargetInstruction) {
    return this.instruction;
  }

  return this.superGet(key);
}

function createElementContainer(parent, element, instruction, bindingContext, children, partReplacements, resources) {
  let container = parent.createChild();
  let providers;
  let i;

  container.element = element;
  container.instruction = instruction;
  container.bindingContext = bindingContext;
  container.children = children;
  container.viewResources = resources;
  container.partReplacements = partReplacements;

  providers = instruction.providers;
  i = providers.length;

  while (i--) {
    container.resolvers.set(providers[i], providerResolverInstance);
  }

  container.superGet = container.get;
  container.get = elementContainerGet;

  return container;
}

function makeElementIntoAnchor(element, elementInstruction) {
  let anchor = DOM.createComment('anchor');

  if (elementInstruction) {
    anchor.hasAttribute = function(name) { return element.hasAttribute(name); };
    anchor.getAttribute = function(name) { return element.getAttribute(name); };
    anchor.setAttribute = function(name, value) { element.setAttribute(name, value); };
  }

  DOM.replaceNode(anchor, element);

  return anchor;
}

function applyInstructions(containers, bindingContext, element, instruction,
  behaviors, bindings, children, contentSelectors, partReplacements, resources) {
  let behaviorInstructions = instruction.behaviorInstructions;
  let expressions = instruction.expressions;
  let elementContainer;
  let i;
  let ii;
  let current;
  let instance;

  if (instruction.contentExpression) {
    bindings.push(instruction.contentExpression.createBinding(element.nextSibling));
    element.parentNode.removeChild(element);
    return;
  }

  if (instruction.contentSelector) {
    let commentAnchor = DOM.createComment('anchor');
    DOM.replaceNode(commentAnchor, element);
    contentSelectors.push(new ContentSelector(commentAnchor, instruction.selector));
    return;
  }

  if (behaviorInstructions.length) {
    if (!instruction.anchorIsContainer) {
      element = makeElementIntoAnchor(element, instruction.elementInstruction);
    }

    containers[instruction.injectorId] = elementContainer =
      createElementContainer(
        containers[instruction.parentInjectorId],
        element,
        instruction,
        bindingContext,
        children,
        partReplacements,
        resources
        );

    for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
      current = behaviorInstructions[i];
      instance = current.type.create(elementContainer, current, element, bindings, current.partReplacements);

      if (instance.contentView) {
        children.push(instance.contentView);
      }

      behaviors.push(instance);
    }
  }

  for (i = 0, ii = expressions.length; i < ii; ++i) {
    bindings.push(expressions[i].createBinding(element));
  }
}

function styleStringToObject(style, target) {
  let attributes = style.split(';');
  let firstIndexOfColon;
  let i;
  let current;
  let key;
  let value;

  target = target || {};

  for (i = 0; i < attributes.length; i++) {
    current = attributes[i];
    firstIndexOfColon = current.indexOf(':');
    key = current.substring(0, firstIndexOfColon).trim();
    value = current.substring(firstIndexOfColon + 1).trim();
    target[key] = value;
  }

  return target;
}

function styleObjectToString(obj) {
  let result = '';

  for (let key in obj) {
    result += key + ':' + obj[key] + ';';
  }

  return result;
}

function applySurrogateInstruction(container, element, instruction, behaviors, bindings, children) {
  let behaviorInstructions = instruction.behaviorInstructions;
  let expressions = instruction.expressions;
  let providers = instruction.providers;
  let values = instruction.values;
  let i;
  let ii;
  let current;
  let instance;
  let currentAttributeValue;

  i = providers.length;
  while (i--) {
    container.resolvers.set(providers[i], providerResolverInstance);
  }

  //apply surrogate attributes
  for (let key in values) {
    currentAttributeValue = element.getAttribute(key);

    if (currentAttributeValue) {
      if (key === 'class') {
        //merge the surrogate classes
        element.setAttribute('class', currentAttributeValue + ' ' + values[key]);
      } else if (key === 'style') {
        //merge the surrogate styles
        let styleObject = styleStringToObject(values[key]);
        styleStringToObject(currentAttributeValue, styleObject);
        element.setAttribute('style', styleObjectToString(styleObject));
      }

      //otherwise, do not overwrite the consumer's attribute
    } else {
      //copy the surrogate attribute
      element.setAttribute(key, values[key]);
    }
  }

  //apply surrogate behaviors
  if (behaviorInstructions.length) {
    for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
      current = behaviorInstructions[i];
      instance = current.type.create(container, current, element, bindings, current.partReplacements);

      if (instance.contentView) {
        children.push(instance.contentView);
      }

      behaviors.push(instance);
    }
  }

  //apply surrogate bindings
  for (i = 0, ii = expressions.length; i < ii; ++i) {
    bindings.push(expressions[i].createBinding(element));
  }
}

export class BoundViewFactory {
  constructor(parentContainer: Container, viewFactory: ViewFactory, bindingContext: Object, partReplacements?: Object) {
    this.parentContainer = parentContainer;
    this.viewFactory = viewFactory;
    this.bindingContext = bindingContext;
    this.factoryCreateInstruction = { partReplacements: partReplacements };
  }

  create(bindingContext?: Object): View {
    let childContainer = this.parentContainer.createChild();
    let context = bindingContext || this.bindingContext;

    this.factoryCreateInstruction.systemControlled = !bindingContext;

    return this.viewFactory.create(childContainer, context, this.factoryCreateInstruction);
  }

  get isCaching() {
    return this.viewFactory.isCaching;
  }

  setCacheSize(size: number | string, doNotOverrideIfAlreadySet: boolean): void {
    this.viewFactory.setCacheSize(size, doNotOverrideIfAlreadySet);
  }

  getCachedView(): View {
    return this.viewFactory.getCachedView();
  }

  returnViewToCache(view: View): void {
    this.viewFactory.returnViewToCache(view);
  }
}

export class ViewFactory {
  constructor(template: DocumentFragment, instructions: Object, resources: ViewResources) {
    this.template = template;
    this.instructions = instructions;
    this.resources = resources;
    this.cacheSize = -1;
    this.cache = null;
    this.isCaching = false;
  }

  setCacheSize(size: number | string, doNotOverrideIfAlreadySet: boolean): void {
    if (size) {
      if (size === '*') {
        size = Number.MAX_VALUE;
      } else if (typeof size === 'string') {
        size = parseInt(size, 10);
      }
    }

    if (this.cacheSize === -1 || !doNotOverrideIfAlreadySet) {
      this.cacheSize = size;
    }

    if (this.cacheSize > 0) {
      this.cache = [];
    } else {
      this.cache = null;
    }

    this.isCaching = this.cacheSize > 0;
  }

  getCachedView(): View {
    return this.cache !== null ? (this.cache.pop() || null) : null;
  }

  returnViewToCache(view: View): void {
    if (view.isAttached) {
      view.detached();
    }

    if (view.isBound) {
      view.unbind();
    }

    if (this.cache !== null && this.cache.length < this.cacheSize) {
      view.fromCache = true;
      this.cache.push(view);
    }
  }

  create(container: Container, bindingContext?: Object, createInstruction?: ViewCreateInstruction, element?: Element): View {
    createInstruction = createInstruction || BehaviorInstruction.normal;
    element = element || null;

    let cachedView = this.getCachedView();
    if (cachedView !== null) {
      if (!createInstruction.suppressBind) {
        cachedView.bind(bindingContext);
      }

      return cachedView;
    }

    let fragment = createInstruction.enhance ? this.template : this.template.cloneNode(true);
    let instructables = fragment.querySelectorAll('.au-target');
    let instructions = this.instructions;
    let resources = this.resources;
    let behaviors = [];
    let bindings = [];
    let children = [];
    let contentSelectors = [];
    let containers = { root: container };
    let partReplacements = createInstruction.partReplacements;
    let i;
    let ii;
    let view;
    let instructable;
    let instruction;

    this.resources.onBeforeCreate(this, container, fragment, createInstruction, bindingContext);

    if (element !== null && this.surrogateInstruction !== null) {
      applySurrogateInstruction(container, element, this.surrogateInstruction, behaviors, bindings, children);
    }

    for (i = 0, ii = instructables.length; i < ii; ++i) {
      instructable = instructables[i];
      instruction = instructions[instructable.getAttribute('au-target-id')];

      applyInstructions(containers, bindingContext, instructable,
        instruction, behaviors, bindings, children, contentSelectors, partReplacements, resources);
    }

    view = new View(this, container, fragment, behaviors, bindings, children, createInstruction.systemControlled, contentSelectors);

    //if iniated by an element behavior, let the behavior trigger this callback once it's done creating the element
    if (!createInstruction.initiatedByBehavior) {
      view.created();
    }

    this.resources.onAfterCreate(view);

    //if the view creation is part of a larger creation, wait to bind until the root view initiates binding
    if (!createInstruction.suppressBind) {
      view.bind(bindingContext);
    }

    return view;
  }
}

let nextInjectorId = 0;
function getNextInjectorId() {
  return ++nextInjectorId;
}

function configureProperties(instruction, resources) {
  let type = instruction.type;
  let attrName = instruction.attrName;
  let attributes = instruction.attributes;
  let property;
  let key;
  let value;

  let knownAttribute = resources.mapAttribute(attrName);
  if (knownAttribute && attrName in attributes && knownAttribute !== attrName) {
    attributes[knownAttribute] = attributes[attrName];
    delete attributes[attrName];
  }

  for (key in attributes) {
    value = attributes[key];

    if (value !== null && typeof value === 'object') {
      property = type.attributes[key];

      if (property !== undefined) {
        value.targetProperty = property.name;
      } else {
        value.targetProperty = key;
      }
    }
  }
}

let lastAUTargetID = 0;
function getNextAUTargetID() {
  return (++lastAUTargetID).toString();
}

function makeIntoInstructionTarget(element) {
  let value = element.getAttribute('class');
  let auTargetID = getNextAUTargetID();

  element.setAttribute('class', (value ? value += ' au-target' : 'au-target'));
  element.setAttribute('au-target-id', auTargetID);

  return auTargetID;
}

@inject(BindingLanguage, ViewResources)
export class ViewCompiler {
  constructor(bindingLanguage: BindingLanguage, resources: ViewResources) {
    this.bindingLanguage = bindingLanguage;
    this.resources = resources;
  }

  compile(source: Element|DocumentFragment|string, resources?: ViewResources, compileInstruction?: ViewCompileInstruction): ViewFactory {
    resources = resources || this.resources;
    compileInstruction = compileInstruction || ViewCompileInstruction.normal;
    source = typeof source === 'string' ? DOM.createTemplateFromMarkup(source) : source;

    let content;
    let part;
    let cacheSize;

    if (source.content) {
      part = source.getAttribute('part');
      cacheSize = source.getAttribute('view-cache');
      content = DOM.adoptNode(source.content);
    } else {
      content = source;
    }

    compileInstruction.targetShadowDOM = compileInstruction.targetShadowDOM && FEATURE.shadowDOM;
    resources.onBeforeCompile(content, resources, compileInstruction);

    let instructions = {};
    this.compileNode(content, resources, instructions, source, 'root', !compileInstruction.targetShadowDOM);
    content.insertBefore(DOM.createComment('<view>'), content.firstChild);
    content.appendChild(DOM.createComment('</view>'));

    let factory = new ViewFactory(content, instructions, resources);

    factory.surrogateInstruction = compileInstruction.compileSurrogate ? this.compileSurrogate(source, resources) : null;
    factory.part = part;

    if (cacheSize) {
      factory.setCacheSize(cacheSize);
    }

    resources.onAfterCompile(factory);

    return factory;
  }

  compileNode(node, resources, instructions, parentNode, parentInjectorId, targetLightDOM) {
    switch (node.nodeType) {
    case 1: //element node
      return this.compileElement(node, resources, instructions, parentNode, parentInjectorId, targetLightDOM);
    case 3: //text node
      //use wholeText to retrieve the textContent of all adjacent text nodes.
      let expression = resources.getBindingLanguage(this.bindingLanguage).parseText(resources, node.wholeText);
      if (expression) {
        let marker = DOM.createElement('au-marker');
        let auTargetID = makeIntoInstructionTarget(marker);
        (node.parentNode || parentNode).insertBefore(marker, node);
        node.textContent = ' ';
        instructions[auTargetID] = TargetInstruction.contentExpression(expression);
        //remove adjacent text nodes.
        while (node.nextSibling && node.nextSibling.nodeType === 3) {
          (node.parentNode || parentNode).removeChild(node.nextSibling);
        }
      } else {
        //skip parsing adjacent text nodes.
        while (node.nextSibling && node.nextSibling.nodeType === 3) {
          node = node.nextSibling;
        }
      }
      return node.nextSibling;
    case 11: //document fragment node
      let currentChild = node.firstChild;
      while (currentChild) {
        currentChild = this.compileNode(currentChild, resources, instructions, node, parentInjectorId, targetLightDOM);
      }
      break;
    default:
      break;
    }

    return node.nextSibling;
  }

  compileSurrogate(node, resources) {
    let attributes = node.attributes;
    let bindingLanguage = resources.getBindingLanguage(this.bindingLanguage);
    let knownAttribute;
    let property;
    let instruction;
    let i;
    let ii;
    let attr;
    let attrName;
    let attrValue;
    let info;
    let type;
    let expressions = [];
    let expression;
    let behaviorInstructions = [];
    let values = {};
    let hasValues = false;
    let providers = [];

    for (i = 0, ii = attributes.length; i < ii; ++i) {
      attr = attributes[i];
      attrName = attr.name;
      attrValue = attr.value;

      info = bindingLanguage.inspectAttribute(resources, attrName, attrValue);
      type = resources.getAttribute(info.attrName);

      if (type) { //do we have an attached behavior?
        knownAttribute = resources.mapAttribute(info.attrName); //map the local name to real name
        if (knownAttribute) {
          property = type.attributes[knownAttribute];

          if (property) { //if there's a defined property
            info.defaultBindingMode = property.defaultBindingMode; //set the default binding mode

            if (!info.command && !info.expression) { // if there is no command or detected expression
              info.command = property.hasOptions ? 'options' : null; //and it is an optons property, set the options command
            }
          }
        }
      }

      instruction = bindingLanguage.createAttributeInstruction(resources, node, info);

      if (instruction) { //HAS BINDINGS
        if (instruction.alteredAttr) {
          type = resources.getAttribute(instruction.attrName);
        }

        if (instruction.discrete) { //ref binding or listener binding
          expressions.push(instruction);
        } else { //attribute bindings
          if (type) { //templator or attached behavior found
            instruction.type = type;
            configureProperties(instruction, resources);

            if (type.liftsContent) { //template controller
              throw new Error('You cannot place a template controller on a surrogate element.');
            } else { //attached behavior
              behaviorInstructions.push(instruction);
            }
          } else { //standard attribute binding
            expressions.push(instruction.attributes[instruction.attrName]);
          }
        }
      } else { //NO BINDINGS
        if (type) { //templator or attached behavior found
          instruction = BehaviorInstruction.attribute(attrName, type);
          instruction.attributes[resources.mapAttribute(attrName)] = attrValue;

          if (type.liftsContent) { //template controller
            throw new Error('You cannot place a template controller on a surrogate element.');
          } else { //attached behavior
            behaviorInstructions.push(instruction);
          }
        } else if (attrName !== 'id' && attrName !== 'part' && attrName !== 'replace-part') {
          hasValues = true;
          values[attrName] = attrValue;
        }
      }
    }

    if (expressions.length || behaviorInstructions.length || hasValues) {
      for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
        instruction = behaviorInstructions[i];
        instruction.type.compile(this, resources, node, instruction);
        providers.push(instruction.type.target);
      }

      for (i = 0, ii = expressions.length; i < ii; ++i) {
        expression =  expressions[i];
        if (expression.attrToRemove !== undefined) {
          node.removeAttribute(expression.attrToRemove);
        }
      }

      return TargetInstruction.surrogate(providers, behaviorInstructions, expressions, values);
    }

    return null;
  }

  compileElement(node, resources, instructions, parentNode, parentInjectorId, targetLightDOM) {
    let tagName = node.tagName.toLowerCase();
    let attributes = node.attributes;
    let expressions = [];
    let expression;
    let behaviorInstructions = [];
    let providers = [];
    let bindingLanguage = resources.getBindingLanguage(this.bindingLanguage);
    let liftingInstruction;
    let viewFactory;
    let type;
    let elementInstruction;
    let elementProperty;
    let i;
    let ii;
    let attr;
    let attrName;
    let attrValue;
    let instruction;
    let info;
    let property;
    let knownAttribute;
    let auTargetID;
    let injectorId;

    if (tagName === 'content') {
      if (targetLightDOM) {
        auTargetID = makeIntoInstructionTarget(node);
        instructions[auTargetID] = TargetInstruction.contentSelector(node, parentInjectorId);
      }
      return node.nextSibling;
    } else if (tagName === 'template') {
      viewFactory = this.compile(node, resources);
      viewFactory.part = node.getAttribute('part');
    } else {
      type = resources.getElement(tagName);
      if (type) {
        elementInstruction = BehaviorInstruction.element(node, type);
        behaviorInstructions.push(elementInstruction);
      }
    }

    for (i = 0, ii = attributes.length; i < ii; ++i) {
      attr = attributes[i];
      attrName = attr.name;
      attrValue = attr.value;
      info = bindingLanguage.inspectAttribute(resources, attrName, attrValue);
      type = resources.getAttribute(info.attrName);
      elementProperty = null;

      if (type) { //do we have an attached behavior?
        knownAttribute = resources.mapAttribute(info.attrName); //map the local name to real name
        if (knownAttribute) {
          property = type.attributes[knownAttribute];

          if (property) { //if there's a defined property
            info.defaultBindingMode = property.defaultBindingMode; //set the default binding mode

            if (!info.command && !info.expression) { // if there is no command or detected expression
              info.command = property.hasOptions ? 'options' : null; //and it is an optons property, set the options command
            }
          }
        }
      } else if (elementInstruction) { //or if this is on a custom element
        elementProperty = elementInstruction.type.attributes[info.attrName];
        if (elementProperty) { //and this attribute is a custom property
          info.defaultBindingMode = elementProperty.defaultBindingMode; //set the default binding mode
        }
      }

      if (elementProperty) {
        instruction = bindingLanguage.createAttributeInstruction(resources, node, info, elementInstruction);
      } else {
        instruction = bindingLanguage.createAttributeInstruction(resources, node, info);
      }

      if (instruction) { //HAS BINDINGS
        if (instruction.alteredAttr) {
          type = resources.getAttribute(instruction.attrName);
        }

        if (instruction.discrete) { //ref binding or listener binding
          expressions.push(instruction);
        } else { //attribute bindings
          if (type) { //templator or attached behavior found
            instruction.type = type;
            configureProperties(instruction, resources);

            if (type.liftsContent) { //template controller
              instruction.originalAttrName = attrName;
              liftingInstruction = instruction;
              break;
            } else { //attached behavior
              behaviorInstructions.push(instruction);
            }
          } else if (elementProperty) { //custom element attribute
            elementInstruction.attributes[info.attrName].targetProperty = elementProperty.name;
          } else { //standard attribute binding
            expressions.push(instruction.attributes[instruction.attrName]);
          }
        }
      } else { //NO BINDINGS
        if (type) { //templator or attached behavior found
          instruction = BehaviorInstruction.attribute(attrName, type);
          instruction.attributes[resources.mapAttribute(attrName)] = attrValue;

          if (type.liftsContent) { //template controller
            instruction.originalAttrName = attrName;
            liftingInstruction = instruction;
            break;
          } else { //attached behavior
            behaviorInstructions.push(instruction);
          }
        } else if (elementProperty) { //custom element attribute
          elementInstruction.attributes[attrName] = attrValue;
        }

        //else; normal attribute; do nothing
      }
    }

    if (liftingInstruction) {
      liftingInstruction.viewFactory = viewFactory;
      node = liftingInstruction.type.compile(this, resources, node, liftingInstruction, parentNode);
      auTargetID = makeIntoInstructionTarget(node);
      instructions[auTargetID] = TargetInstruction.lifting(parentInjectorId, liftingInstruction);
    } else {
      if (expressions.length || behaviorInstructions.length) {
        injectorId = behaviorInstructions.length ? getNextInjectorId() : false;

        for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
          instruction = behaviorInstructions[i];
          instruction.type.compile(this, resources, node, instruction, parentNode);
          providers.push(instruction.type.target);
        }

        for (i = 0, ii = expressions.length; i < ii; ++i) {
          expression =  expressions[i];
          if (expression.attrToRemove !== undefined) {
            node.removeAttribute(expression.attrToRemove);
          }
        }

        auTargetID = makeIntoInstructionTarget(node);
        instructions[auTargetID] = TargetInstruction.normal(
          injectorId,
          parentInjectorId,
          providers,
          behaviorInstructions,
          expressions,
          elementInstruction
        );
      }

      if (elementInstruction && elementInstruction.skipContentProcessing) {
        return node.nextSibling;
      }

      let currentChild = node.firstChild;
      while (currentChild) {
        currentChild = this.compileNode(currentChild, resources, instructions, node, injectorId || parentInjectorId, targetLightDOM);
      }
    }

    return node.nextSibling;
  }
}

export class ResourceModule {
  constructor(moduleId: string) {
    this.id = moduleId;
    this.moduleInstance = null;
    this.mainResource = null;
    this.resources = null;
    this.viewStrategy = null;
    this.isInitialized = false;
    this.onLoaded = null;
  }

  initialize(container: Container) {
    let current = this.mainResource;
    let resources = this.resources;
    let viewStrategy = this.viewStrategy;

    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    if (current !== undefined) {
      current.metadata.viewStrategy = viewStrategy;
      current.initialize(container);
    }

    for (let i = 0, ii = resources.length; i < ii; ++i) {
      current = resources[i];
      current.metadata.viewStrategy = viewStrategy;
      current.initialize(container);
    }
  }

  register(registry:ViewResources, name?:string) {
    let main = this.mainResource;
    let resources = this.resources;

    if (main !== undefined) {
      main.register(registry, name);
      name = null;
    }

    for (let i = 0, ii = resources.length; i < ii; ++i) {
      resources[i].register(registry, name);
      name = null;
    }
  }

  load(container: Container, loadContext?: ResourceLoadContext): Promise<void> {
    if (this.onLoaded !== null) {
      return this.onLoaded;
    }

    let main = this.mainResource;
    let resources = this.resources;
    let loads;

    if (main !== undefined) {
      loads = new Array(resources.length + 1);
      loads[0] = main.load(container, loadContext);
      for (let i = 0, ii = resources.length; i < ii; ++i) {
        loads[i + 1] = resources[i].load(container, loadContext);
      }
    } else {
      loads = new Array(resources.length);
      for (let i = 0, ii = resources.length; i < ii; ++i) {
        loads[i] = resources[i].load(container, loadContext);
      }
    }

    this.onLoaded = Promise.all(loads);
    return this.onLoaded;
  }
}

export class ResourceDescription {
  constructor(key: string, exportedValue: any, resourceTypeMeta: Object) {
    if (!resourceTypeMeta) {
      resourceTypeMeta = metadata.get(metadata.resource, exportedValue);

      if (!resourceTypeMeta) {
        resourceTypeMeta = new HtmlBehaviorResource();
        resourceTypeMeta.elementName = hyphenate(key);
        metadata.define(metadata.resource, resourceTypeMeta, exportedValue);
      }
    }

    if (resourceTypeMeta instanceof HtmlBehaviorResource) {
      if (resourceTypeMeta.elementName === undefined) {
        //customeElement()
        resourceTypeMeta.elementName = hyphenate(key);
      } else if (resourceTypeMeta.attributeName === undefined) {
        //customAttribute()
        resourceTypeMeta.attributeName = hyphenate(key);
      } else if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
        //no customeElement or customAttribute but behavior added by other metadata
        HtmlBehaviorResource.convention(key, resourceTypeMeta);
      }
    } else if (!resourceTypeMeta.name) {
      resourceTypeMeta.name = hyphenate(key);
    }

    this.metadata = resourceTypeMeta;
    this.value = exportedValue;
  }

  initialize(container: Container): void {
    this.metadata.initialize(container, this.value);
  }

  register(registry: ViewResources, name?: string): void {
    this.metadata.register(registry, name);
  }

  load(container: Container, loadContext?: ResourceLoadContext): Promise<void> | void {
    return this.metadata.load(container, this.value, null, null, loadContext);
  }
}

export class ModuleAnalyzer {
  constructor() {
    this.cache = {};
  }

  getAnalysis(moduleId: string): ResourceModule {
    return this.cache[moduleId];
  }

  analyze(moduleId: string, moduleInstance: any, viewModelMember?: string): ResourceModule {
    let mainResource;
    let fallbackValue;
    let fallbackKey;
    let resourceTypeMeta;
    let key;
    let exportedValue;
    let resources = [];
    let conventional;
    let viewStrategy;
    let resourceModule;

    resourceModule = this.cache[moduleId];
    if (resourceModule) {
      return resourceModule;
    }

    resourceModule = new ResourceModule(moduleId);
    this.cache[moduleId] = resourceModule;

    if (typeof moduleInstance === 'function') {
      moduleInstance = {'default': moduleInstance};
    }

    if (viewModelMember) {
      mainResource = new ResourceDescription(viewModelMember, moduleInstance[viewModelMember]);
    }

    for (key in moduleInstance) {
      exportedValue = moduleInstance[key];

      if (key === viewModelMember || typeof exportedValue !== 'function') {
        continue;
      }

      resourceTypeMeta = metadata.get(metadata.resource, exportedValue);

      if (resourceTypeMeta) {
        if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
          //no customeElement or customAttribute but behavior added by other metadata
          HtmlBehaviorResource.convention(key, resourceTypeMeta);
        }

        if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
          //no convention and no customeElement or customAttribute but behavior added by other metadata
          resourceTypeMeta.elementName = hyphenate(key);
        }

        if (!mainResource && resourceTypeMeta instanceof HtmlBehaviorResource && resourceTypeMeta.elementName !== null) {
          mainResource = new ResourceDescription(key, exportedValue, resourceTypeMeta);
        } else {
          resources.push(new ResourceDescription(key, exportedValue, resourceTypeMeta));
        }
      } else if (exportedValue instanceof ViewStrategy) {
        viewStrategy = exportedValue;
      } else if (exportedValue instanceof TemplateRegistryEntry) {
        viewStrategy = new TemplateRegistryViewStrategy(moduleId, exportedValue);
      } else {
        if (conventional = HtmlBehaviorResource.convention(key)) {
          if (conventional.elementName !== null && !mainResource) {
            mainResource = new ResourceDescription(key, exportedValue, conventional);
          } else {
            resources.push(new ResourceDescription(key, exportedValue, conventional));
          }

          metadata.define(metadata.resource, conventional, exportedValue);
        } else if (conventional = ValueConverterResource.convention(key)) {
          resources.push(new ResourceDescription(key, exportedValue, conventional));
          metadata.define(metadata.resource, conventional, exportedValue);
        } else if (!fallbackValue) {
          fallbackValue = exportedValue;
          fallbackKey = key;
        }
      }
    }

    if (!mainResource && fallbackValue) {
      mainResource = new ResourceDescription(fallbackKey, fallbackValue);
    }

    resourceModule.moduleInstance = moduleInstance;
    resourceModule.mainResource = mainResource;
    resourceModule.resources = resources;
    resourceModule.viewStrategy = viewStrategy;

    return resourceModule;
  }
}

let logger = LogManager.getLogger('templating');

function ensureRegistryEntry(loader, urlOrRegistryEntry) {
  if (urlOrRegistryEntry instanceof TemplateRegistryEntry) {
    return Promise.resolve(urlOrRegistryEntry);
  }

  return loader.loadTemplate(urlOrRegistryEntry);
}

class ProxyViewFactory {
  constructor(promise) {
    promise.then(x => this.viewFactory = x);
  }

  create(container: Container, bindingContext?: Object, createInstruction?: ViewCreateInstruction, element?: Element): View {
    return this.viewFactory.create(container, bindingContext, createInstruction, element);
  }

  get isCaching() {
    return this.viewFactory.isCaching;
  }

  setCacheSize(size: number | string, doNotOverrideIfAlreadySet: boolean): void {
    this.viewFactory.setCacheSize(size, doNotOverrideIfAlreadySet);
  }

  getCachedView(): View {
    return this.viewFactory.getCachedView();
  }

  returnViewToCache(view: View): void {
    this.viewFactory.returnViewToCache(view);
  }
}

export class ViewEngine {
  static inject = [Loader, Container, ViewCompiler, ModuleAnalyzer, ViewResources];
  constructor(loader: Loader, container: Container, viewCompiler: ViewCompiler, moduleAnalyzer: ModuleAnalyzer, appResources: ViewResources) {
    this.loader = loader;
    this.container = container;
    this.viewCompiler = viewCompiler;
    this.moduleAnalyzer = moduleAnalyzer;
    this.appResources = appResources;
    this._pluginMap = {};
  }

  addResourcePlugin(extension: string, implementation: string) {
    let name = extension.replace('.', '') + '-resource-plugin';
    this._pluginMap[extension] = name;
    this.loader.addPlugin(name, implementation);
  }

  enhance(container: Container, element: Element, resources: ViewResources, bindingContext?: Object): View {
    let instructions = {};
    this.viewCompiler.compileNode(element, resources, instructions, element.parentNode, 'root', true);

    let factory = new ViewFactory(element, instructions, resources);
    return factory.create(container, bindingContext, { enhance: true });
  }

  loadViewFactory(urlOrRegistryEntry: string|TemplateRegistryEntry, compileInstruction?: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewFactory> {
    loadContext = loadContext || new ResourceLoadContext();

    return ensureRegistryEntry(this.loader, urlOrRegistryEntry).then(viewRegistryEntry => {
      if (viewRegistryEntry.onReady) {
        if (loadContext.doesNotHaveDependency(urlOrRegistryEntry)) {
          loadContext.addDependency(urlOrRegistryEntry);
          return viewRegistryEntry.onReady;
        }

        return Promise.resolve(new ProxyViewFactory(viewRegistryEntry.onReady));
      }

      loadContext.addDependency(urlOrRegistryEntry);

      viewRegistryEntry.onReady = this.loadTemplateResources(viewRegistryEntry, compileInstruction, loadContext).then(resources => {
        viewRegistryEntry.setResources(resources);
        let viewFactory = this.viewCompiler.compile(viewRegistryEntry.template, resources, compileInstruction);
        viewRegistryEntry.setFactory(viewFactory);
        return viewFactory;
      });

      return viewRegistryEntry.onReady;
    });
  }

  loadTemplateResources(viewRegistryEntry: TemplateRegistryEntry, compileInstruction?: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewResources> {
    let resources = new ViewResources(this.appResources, viewRegistryEntry.address);
    let dependencies = viewRegistryEntry.dependencies;
    let importIds;
    let names;

    compileInstruction = compileInstruction || ViewCompileInstruction.normal;

    if (dependencies.length === 0 && !compileInstruction.associatedModuleId) {
      return Promise.resolve(resources);
    }

    importIds = dependencies.map(x => x.src);
    names = dependencies.map(x => x.name);
    logger.debug(`importing resources for ${viewRegistryEntry.address}`, importIds);

    return this.importViewResources(importIds, names, resources, compileInstruction, loadContext);
  }

  importViewModelResource(moduleImport: string, moduleMember: string): Promise<ResourceDescription> {
    return this.loader.loadModule(moduleImport).then(viewModelModule => {
      let normalizedId = Origin.get(viewModelModule).moduleId;
      let resourceModule = this.moduleAnalyzer.analyze(normalizedId, viewModelModule, moduleMember);

      if (!resourceModule.mainResource) {
        throw new Error(`No view model found in module "${moduleImport}".`);
      }

      resourceModule.initialize(this.container);

      return resourceModule.mainResource;
    });
  }

  importViewResources(moduleIds: string[], names: string[], resources: ViewResources, compileInstruction?: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewResources> {
    loadContext = loadContext || new ResourceLoadContext();
    compileInstruction = compileInstruction || ViewCompileInstruction.normal;

    moduleIds = moduleIds.map(x => this._applyLoaderPlugin(x));

    return this.loader.loadAllModules(moduleIds).then(imports => {
      let i;
      let ii;
      let analysis;
      let normalizedId;
      let current;
      let associatedModule;
      let container = this.container;
      let moduleAnalyzer = this.moduleAnalyzer;
      let allAnalysis = new Array(imports.length);

      //initialize and register all resources first
      //this enables circular references for global refs
      //and enables order independence
      for (i = 0, ii = imports.length; i < ii; ++i) {
        current = imports[i];
        normalizedId = Origin.get(current).moduleId;

        analysis = moduleAnalyzer.analyze(normalizedId, current);
        analysis.initialize(container);
        analysis.register(resources, names[i]);

        allAnalysis[i] = analysis;
      }

      if (compileInstruction.associatedModuleId) {
        associatedModule = moduleAnalyzer.getAnalysis(compileInstruction.associatedModuleId);

        if (associatedModule) {
          associatedModule.register(resources);
        }
      }

      //cause compile/load of any associated views second
      //as a result all globals have access to all other globals during compilation
      for (i = 0, ii = allAnalysis.length; i < ii; ++i) {
        allAnalysis[i] = allAnalysis[i].load(container, loadContext);
      }

      return Promise.all(allAnalysis).then(() => resources);
    });
  }

  _applyLoaderPlugin(id) {
    let index = id.lastIndexOf('.');
    if (index !== -1) {
      let ext = id.substring(index);
      let pluginName = this._pluginMap[ext];

      if (pluginName === undefined) {
        return id;
      }

      return this.loader.applyPluginToUrl(id, pluginName);
    }

    return id;
  }
}

export class Controller {
  constructor(behavior, model, instruction) {
    this.behavior = behavior;
    this.model = model;
    this.isAttached = false;

    let observerLookup = behavior.observerLocator.getOrCreateObserversLookup(model);
    let handlesBind = behavior.handlesBind;
    let attributes = instruction.attributes;
    let boundProperties = this.boundProperties = [];
    let properties = behavior.properties;
    let i;
    let ii;

    behavior.ensurePropertiesDefined(model, observerLookup);

    for (i = 0, ii = properties.length; i < ii; ++i) {
      properties[i].initialize(model, observerLookup, attributes, handlesBind, boundProperties);
    }
  }

  created(context) {
    if (this.behavior.handlesCreated) {
      this.model.created(context);
    }
  }

  bind(context) {
    let skipSelfSubscriber = this.behavior.handlesBind;
    let boundProperties = this.boundProperties;
    let i;
    let ii;
    let x;
    let observer;
    let selfSubscriber;

    for (i = 0, ii = boundProperties.length; i < ii; ++i) {
      x = boundProperties[i];
      observer = x.observer;
      selfSubscriber = observer.selfSubscriber;
      observer.publishing = false;

      if (skipSelfSubscriber) {
        observer.selfSubscriber = null;
      }

      x.binding.bind(context);
      observer.call();

      observer.publishing = true;
      observer.selfSubscriber = selfSubscriber;
    }

    if (skipSelfSubscriber) {
      this.model.bind(context);
    }

    if (this.view) {
      this.view.bind(this.model);
    }
  }

  unbind() {
    let boundProperties = this.boundProperties;
    let i;
    let ii;

    if (this.view) {
      this.view.unbind();
    }

    if (this.behavior.handlesUnbind) {
      this.model.unbind();
    }

    for (i = 0, ii = boundProperties.length; i < ii; ++i) {
      boundProperties[i].binding.unbind();
    }
  }

  attached() {
    if (this.isAttached) {
      return;
    }

    this.isAttached = true;

    if (this.behavior.handlesAttached) {
      this.model.attached();
    }

    if (this.view) {
      this.view.attached();
    }
  }

  detached() {
    if (this.isAttached) {
      this.isAttached = false;

      if (this.view) {
        this.view.detached();
      }

      if (this.behavior.handlesDetached) {
        this.model.detached();
      }
    }
  }
}

@subscriberCollection()
export class BehaviorPropertyObserver {
  constructor(taskQueue, obj, propertyName, selfSubscriber, initialValue) {
    this.taskQueue = taskQueue;
    this.obj = obj;
    this.propertyName = propertyName;
    this.notqueued = true;
    this.publishing = false;
    this.selfSubscriber = selfSubscriber;
    this.currentValue = this.oldValue = initialValue;
  }

  getValue() {
    return this.currentValue;
  }

  setValue(newValue) {
    let oldValue = this.currentValue;

    if (oldValue !== newValue) {
      if (this.publishing && this.notqueued) {
        this.notqueued = false;
        this.taskQueue.queueMicroTask(this);
      }

      this.oldValue = oldValue;
      this.currentValue = newValue;
    }
  }

  call() {
    let oldValue = this.oldValue;
    let newValue = this.currentValue;

    this.notqueued = true;

    if (newValue === oldValue) {
      return;
    }

    if (this.selfSubscriber) {
      this.selfSubscriber(newValue, oldValue);
    }

    this.callSubscribers(newValue, oldValue);
    this.oldValue = newValue;
  }

  subscribe(context, callable) {
    this.addSubscriber(context, callable);
  }

  unsubscribe(context, callable) {
    this.removeSubscriber(context, callable);
  }
}

function getObserver(behavior, instance, name) {
  let lookup = instance.__observers__;

  if (lookup === undefined) {
    lookup = behavior.observerLocator.getOrCreateObserversLookup(instance);
    behavior.ensurePropertiesDefined(instance, lookup);
  }

  return lookup[name];
}

export class BindableProperty {
  constructor(nameOrConfig) {
    if (typeof nameOrConfig === 'string') {
      this.name = nameOrConfig;
    } else {
      Object.assign(this, nameOrConfig);
    }

    this.attribute = this.attribute || hyphenate(this.name);
    this.defaultBindingMode = this.defaultBindingMode || bindingMode.oneWay;
    this.changeHandler = this.changeHandler || null;
    this.owner = null;
  }

  registerWith(target, behavior, descriptor) {
    behavior.properties.push(this);
    behavior.attributes[this.attribute] = this;
    this.owner = behavior;

    if (descriptor) {
      this.descriptor = descriptor;
      return this.configureDescriptor(behavior, descriptor);
    }
  }

  configureDescriptor(behavior, descriptor) {
    let name = this.name;

    descriptor.configurable = true;
    descriptor.enumerable = true;

    if ('initializer' in descriptor) {
      this.defaultValue = descriptor.initializer;
      delete descriptor.initializer;
      delete descriptor.writable;
    }

    if ('value' in descriptor) {
      this.defaultValue = descriptor.value;
      delete descriptor.value;
      delete descriptor.writable;
    }

    descriptor.get = function() {
      return getObserver(behavior, this, name).getValue();
    };

    descriptor.set = function(value) {
      getObserver(behavior, this, name).setValue(value);
    };

    descriptor.get.getObserver = function(obj) {
      return getObserver(behavior, obj, name);
    };

    return descriptor;
  }

  defineOn(target, behavior) {
    let name = this.name;
    let handlerName;

    if (this.changeHandler === null) {
      handlerName = name + 'Changed';
      if (handlerName in target.prototype) {
        this.changeHandler = handlerName;
      }
    }

    if (!this.descriptor) {
      Object.defineProperty(target.prototype, name, this.configureDescriptor(behavior, {}));
    }
  }

  createObserver(bindingContext) {
    let selfSubscriber = null;
    let defaultValue = this.defaultValue;
    let changeHandlerName = this.changeHandler;
    let name = this.name;
    let initialValue;

    if (this.hasOptions) {
      return undefined;
    }

    if (changeHandlerName in bindingContext) {
      if ('propertyChanged' in bindingContext) {
        selfSubscriber = (newValue, oldValue) => {
          bindingContext[changeHandlerName](newValue, oldValue);
          bindingContext.propertyChanged(name, newValue, oldValue);
        };
      } else {
        selfSubscriber = (newValue, oldValue) => bindingContext[changeHandlerName](newValue, oldValue);
      }
    } else if ('propertyChanged' in bindingContext) {
      selfSubscriber = (newValue, oldValue) => bindingContext.propertyChanged(name, newValue, oldValue);
    } else if (changeHandlerName !== null) {
      throw new Error(`Change handler ${changeHandlerName} was specified but not delcared on the class.`);
    }

    if (defaultValue !== undefined) {
      initialValue = typeof defaultValue === 'function' ? defaultValue.call(bindingContext) : defaultValue;
    }

    return new BehaviorPropertyObserver(this.owner.taskQueue, bindingContext, this.name, selfSubscriber, initialValue);
  }

  initialize(bindingContext, observerLookup, attributes, behaviorHandlesBind, boundProperties) {
    let selfSubscriber;
    let observer;
    let attribute;
    let defaultValue = this.defaultValue;

    if (this.isDynamic) {
      for (let key in attributes) {
        this.createDynamicProperty(bindingContext, observerLookup, behaviorHandlesBind, key, attributes[key], boundProperties);
      }
    } else if (!this.hasOptions) {
      observer = observerLookup[this.name];

      if (attributes !== null) {
        selfSubscriber = observer.selfSubscriber;
        attribute = attributes[this.attribute];

        if (behaviorHandlesBind) {
          observer.selfSubscriber = null;
        }

        if (typeof attribute === 'string') {
          bindingContext[this.name] = attribute;
          observer.call();
        } else if (attribute) {
          boundProperties.push({observer: observer, binding: attribute.createBinding(bindingContext)});
        } else if (defaultValue !== undefined) {
          observer.call();
        }

        observer.selfSubscriber = selfSubscriber;
      }

      observer.publishing = true;
    }
  }

  createDynamicProperty(bindingContext, observerLookup, behaviorHandlesBind, name, attribute, boundProperties) {
    let changeHandlerName = name + 'Changed';
    let selfSubscriber = null;
    let observer;
    let info;

    if (changeHandlerName in bindingContext) {
      if ('propertyChanged' in bindingContext) {
        selfSubscriber = (newValue, oldValue) => {
          bindingContext[changeHandlerName](newValue, oldValue);
          bindingContext.propertyChanged(name, newValue, oldValue);
        };
      } else {
        selfSubscriber = (newValue, oldValue) => bindingContext[changeHandlerName](newValue, oldValue);
      }
    } else if ('propertyChanged' in bindingContext) {
      selfSubscriber = (newValue, oldValue) => bindingContext.propertyChanged(name, newValue, oldValue);
    }

    observer = observerLookup[name] = new BehaviorPropertyObserver(
        this.owner.taskQueue,
        bindingContext,
        name,
        selfSubscriber
        );

    Object.defineProperty(bindingContext, name, {
      configurable: true,
      enumerable: true,
      get: observer.getValue.bind(observer),
      set: observer.setValue.bind(observer)
    });

    if (behaviorHandlesBind) {
      observer.selfSubscriber = null;
    }

    if (typeof attribute === 'string') {
      bindingContext[name] = attribute;
      observer.call();
    } else if (attribute) {
      info = {observer: observer, binding: attribute.createBinding(bindingContext)};
      boundProperties.push(info);
    }

    observer.publishing = true;
    observer.selfSubscriber = selfSubscriber;
  }
}

const contentSelectorViewCreateInstruction = { suppressBind: true, enhance: false };
let lastProviderId = 0;

function nextProviderId() {
  return ++lastProviderId;
}

function doProcessContent() {
  return true;
}

export class HtmlBehaviorResource {
  constructor() {
    this.elementName = null;
    this.attributeName = null;
    this.attributeDefaultBindingMode = undefined;
    this.liftsContent = false;
    this.targetShadowDOM = false;
    this.processContent = doProcessContent;
    this.usesShadowDOM = false;
    this.childBindings = null;
    this.hasDynamicOptions = false;
    this.containerless = false;
    this.properties = [];
    this.attributes = {};
  }

  static convention(name: string, existing?: HtmlBehaviorResource): HtmlBehaviorResource {
    let behavior;

    if (name.endsWith('CustomAttribute')) {
      behavior = existing || new HtmlBehaviorResource();
      behavior.attributeName = hyphenate(name.substring(0, name.length - 15));
    }

    if (name.endsWith('CustomElement')) {
      behavior = existing || new HtmlBehaviorResource();
      behavior.elementName = hyphenate(name.substring(0, name.length - 13));
    }

    return behavior;
  }

  addChildBinding(behavior: BindingExpression): void {
    if (this.childBindings === null) {
      this.childBindings = [];
    }

    this.childBindings.push(behavior);
  }

  initialize(container: Container, target: Function): void {
    let proto = target.prototype;
    let properties = this.properties;
    let attributeName = this.attributeName;
    let attributeDefaultBindingMode = this.attributeDefaultBindingMode;
    let i;
    let ii;
    let current;

    target.__providerId__ = nextProviderId();

    this.observerLocator = container.get(ObserverLocator);
    this.taskQueue = container.get(TaskQueue);

    this.target = target;
    this.usesShadowDOM = this.targetShadowDOM && FEATURE.shadowDOM;
    this.handlesCreated = ('created' in proto);
    this.handlesBind = ('bind' in proto);
    this.handlesUnbind = ('unbind' in proto);
    this.handlesAttached = ('attached' in proto);
    this.handlesDetached = ('detached' in proto);
    this.htmlName = this.elementName || this.attributeName;

    if (attributeName !== null) {
      if (properties.length === 0) { //default for custom attributes
        new BindableProperty({
          name: 'value',
          changeHandler: 'valueChanged' in proto ? 'valueChanged' : null,
          attribute: attributeName,
          defaultBindingMode: attributeDefaultBindingMode
        }).registerWith(target, this);
      }

      current = properties[0];

      if (properties.length === 1 && current.name === 'value') { //default for custom attributes
        current.isDynamic = current.hasOptions = this.hasDynamicOptions;
        current.defineOn(target, this);
      } else { //custom attribute with options
        for (i = 0, ii = properties.length; i < ii; ++i) {
          properties[i].defineOn(target, this);
        }

        current = new BindableProperty({
          name: 'value',
          changeHandler: 'valueChanged' in proto ? 'valueChanged' : null,
          attribute: attributeName,
          defaultBindingMode: attributeDefaultBindingMode
        });

        current.hasOptions = true;
        current.registerWith(target, this);
      }
    } else {
      for (i = 0, ii = properties.length; i < ii; ++i) {
        properties[i].defineOn(target, this);
      }
    }
  }

  register(registry: ViewResources, name?: string): void {
    if (this.attributeName !== null) {
      registry.registerAttribute(name || this.attributeName, this, this.attributeName);
    }

    if (this.elementName !== null) {
      registry.registerElement(name || this.elementName, this);
    }
  }

  load(container: Container, target: Function, viewStrategy?: ViewStrategy, transientView?: boolean, loadContext?: ResourceLoadContext): Promise<HtmlBehaviorResource> {
    let options;

    if (this.elementName !== null) {
      viewStrategy = viewStrategy || this.viewStrategy || ViewStrategy.getDefault(target);
      options = new ViewCompileInstruction(this.targetShadowDOM, true);

      if (!viewStrategy.moduleId) {
        viewStrategy.moduleId = Origin.get(target).moduleId;
      }

      return viewStrategy.loadViewFactory(container.get(ViewEngine), options, loadContext).then(viewFactory => {
        if (!transientView || !this.viewFactory) {
          this.viewFactory = viewFactory;
        }

        return viewFactory;
      });
    }

    return Promise.resolve(this);
  }

  compile(compiler: ViewCompiler, resources: ViewResources, node: Node, instruction: BehaviorInstruction, parentNode?: Node): Node {
    if (this.liftsContent) {
      if (!instruction.viewFactory) {
        let template = DOM.createElement('template');
        let fragment = DOM.createDocumentFragment();
        let cacheSize = node.getAttribute('view-cache');
        let part = node.getAttribute('part');

        node.removeAttribute(instruction.originalAttrName);
        DOM.replaceNode(template, node, parentNode);
        fragment.appendChild(node);
        instruction.viewFactory = compiler.compile(fragment, resources);

        if (part) {
          instruction.viewFactory.part = part;
          node.removeAttribute('part');
        }

        if (cacheSize) {
          instruction.viewFactory.setCacheSize(cacheSize);
          node.removeAttribute('view-cache');
        }

        node = template;
      }
    } else if (this.elementName !== null) { //custom element
      let partReplacements = instruction.partReplacements = {};

      if (this.processContent(compiler, resources, node, instruction) && node.hasChildNodes()) {
        if (this.usesShadowDOM) {
          let currentChild = node.firstChild;
          let nextSibling;
          let toReplace;

          while (currentChild) {
            nextSibling = currentChild.nextSibling;

            if (currentChild.tagName === 'TEMPLATE' && (toReplace = currentChild.getAttribute('replace-part'))) {
              partReplacements[toReplace] = compiler.compile(currentChild, resources);
              DOM.removeNode(currentChild, parentNode);
            }

            currentChild = nextSibling;
          }

          instruction.skipContentProcessing = false;
        } else {
          let fragment = DOM.createDocumentFragment();
          let currentChild = node.firstChild;
          let nextSibling;
          let toReplace;

          while (currentChild) {
            nextSibling = currentChild.nextSibling;

            if (currentChild.tagName === 'TEMPLATE' && (toReplace = currentChild.getAttribute('replace-part'))) {
              partReplacements[toReplace] = compiler.compile(currentChild, resources);
              DOM.removeNode(currentChild, parentNode);
            } else {
              fragment.appendChild(currentChild);
            }

            currentChild = nextSibling;
          }

          instruction.contentFactory = compiler.compile(fragment, resources);
          instruction.skipContentProcessing = true;
        }
      } else {
        instruction.skipContentProcessing = true;
      }
    }

    return node;
  }

  create(container: Container, instruction?: BehaviorInstruction, element?: Element, bindings?: Binding[]): Controller {
    let host;
    let au = null;

    instruction = instruction || BehaviorInstruction.normal;
    element = element || null;
    bindings = bindings || null;

    if (this.elementName !== null && element) {
      if (this.usesShadowDOM) {
        host = element.createShadowRoot();
        container.registerInstance(DOM.boundary, host);
      } else {
        host = element;

        if (this.targetShadowDOM) {
          container.registerInstance(DOM.boundary, host);
        }
      }
    }

    if (element !== null) {
      element.au = au = element.au || {};
    }

    let model = instruction.bindingContext || container.get(this.target);
    let controller = new Controller(this, model, instruction);
    let childBindings = this.childBindings;
    let viewFactory;

    if (this.liftsContent) {
      //template controller
      au.controller = controller;
    } else if (this.elementName !== null) {
      //custom element
      viewFactory = instruction.viewFactory || this.viewFactory;
      container.viewModel = model;

      if (viewFactory) {
        controller.view = viewFactory.create(container, model, instruction, element);
      }

      if (element !== null) {
        au.controller = controller;

        if (controller.view) {
          if (!this.usesShadowDOM) {
            if (instruction.contentFactory) {
              let contentView = instruction.contentFactory.create(container, null, contentSelectorViewCreateInstruction);

              ContentSelector.applySelectors(
                contentView,
                controller.view.contentSelectors,
                (contentSelector, group) => contentSelector.add(group)
              );

              controller.contentView = contentView;
            }
          }

          if (instruction.anchorIsContainer) {
            if (childBindings !== null) {
              for (let i = 0, ii = childBindings.length; i < ii; ++i) {
                controller.view.addBinding(childBindings[i].create(host, model));
              }
            }

            controller.view.appendNodesTo(host);
          } else {
            controller.view.insertNodesBefore(host);
          }
        } else if (childBindings !== null) {
          for (let i = 0, ii = childBindings.length; i < ii; ++i) {
            bindings.push(childBindings[i].create(element, model));
          }
        }
      } else if (controller.view) {
        //dynamic element with view
        controller.view.owner = controller;

        if (childBindings !== null) {
          for (let i = 0, ii = childBindings.length; i < ii; ++i) {
            controller.view.addBinding(childBindings[i].create(instruction.host, model));
          }
        }
      } else if (childBindings !== null) {
        //dynamic element without view
        for (let i = 0, ii = childBindings.length; i < ii; ++i) {
          bindings.push(childBindings[i].create(instruction.host, model));
        }
      }
    } else if (childBindings !== null) {
      //custom attribute
      for (let i = 0, ii = childBindings.length; i < ii; ++i) {
        bindings.push(childBindings[i].create(element, model));
      }
    }

    if (au !== null) {
      au[this.htmlName] = controller;
    }

    if (instruction.initiatedByBehavior && viewFactory) {
      controller.view.created();
    }

    return controller;
  }

  ensurePropertiesDefined(instance: Object, lookup: Object) {
    let properties;
    let i;
    let ii;
    let observer;

    if ('__propertiesDefined__' in lookup) {
      return;
    }

    lookup.__propertiesDefined__ = true;
    properties = this.properties;

    for (i = 0, ii = properties.length; i < ii; ++i) {
      observer = properties[i].createObserver(instance);

      if (observer !== undefined) {
        lookup[observer.propertyName] = observer;
      }
    }
  }
}

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

export class CompositionEngine {
  static inject = [ViewEngine];

  constructor(viewEngine) {
    this.viewEngine = viewEngine;
  }

  activate(instruction) {
    if (instruction.skipActivation || typeof instruction.viewModel.activate !== 'function') {
      return Promise.resolve();
    }

    return instruction.viewModel.activate(instruction.model) || Promise.resolve();
  }

  createControllerAndSwap(instruction) {
    let removeResponse = instruction.viewSlot.removeAll(true);

    if (removeResponse instanceof Promise) {
      return removeResponse.then(() => {
        return this.createController(instruction).then(controller => {
          if (instruction.currentBehavior) {
            instruction.currentBehavior.unbind();
          }

          controller.view.bind(controller.model);
          instruction.viewSlot.add(controller.view);

          return controller;
        });
      });
    }

    return this.createController(instruction).then(controller => {
      if (instruction.currentBehavior) {
        instruction.currentBehavior.unbind();
      }

      controller.view.bind(controller.model);
      instruction.viewSlot.add(controller.view);

      return controller;
    });
  }

  createController(instruction) {
    let childContainer = instruction.childContainer;
    let viewModelResource = instruction.viewModelResource;
    let viewModel = instruction.viewModel;
    let metadata;

    return this.activate(instruction).then(() => {
      let doneLoading;
      let viewStrategyFromViewModel;
      let origin;

      if ('getViewStrategy' in viewModel && !instruction.view) {
        viewStrategyFromViewModel = true;
        instruction.view = ViewStrategy.normalize(viewModel.getViewStrategy());
      }

      if (instruction.view) {
        if (viewStrategyFromViewModel) {
          origin = Origin.get(viewModel.constructor);
          if (origin) {
            instruction.view.makeRelativeTo(origin.moduleId);
          }
        } else if (instruction.viewResources) {
          instruction.view.makeRelativeTo(instruction.viewResources.viewUrl);
        }
      }

      if (viewModelResource) {
        metadata = viewModelResource.metadata;
        doneLoading = metadata.load(childContainer, viewModelResource.value, instruction.view, true);
      } else {
        metadata = new HtmlBehaviorResource();
        metadata.elementName = 'dynamic-element';
        metadata.initialize(instruction.container || childContainer, viewModel.constructor);
        doneLoading = metadata.load(childContainer, viewModel.constructor, instruction.view, true).then(viewFactory => {
          return viewFactory;
        });
      }

      return doneLoading.then(viewFactory => {
        return metadata.create(childContainer, BehaviorInstruction.dynamic(instruction.host, viewModel, viewFactory));
      });
    });
  }

  createViewModel(instruction) {
    let childContainer = instruction.childContainer || instruction.container.createChild();

    instruction.viewModel = instruction.viewResources
        ? instruction.viewResources.relativeToView(instruction.viewModel)
        : instruction.viewModel;

    return this.viewEngine.importViewModelResource(instruction.viewModel).then(viewModelResource => {
      childContainer.autoRegister(viewModelResource.value);

      if (instruction.host) {
        childContainer.registerInstance(DOM.Element, instruction.host);
      }

      instruction.viewModel = childContainer.viewModel = childContainer.get(viewModelResource.value);
      instruction.viewModelResource = viewModelResource;
      return instruction;
    });
  }

  compose(instruction) {
    instruction.childContainer = instruction.childContainer || instruction.container.createChild();
    instruction.view = ViewStrategy.normalize(instruction.view);

    if (instruction.viewModel) {
      if (typeof instruction.viewModel === 'string') {
        return this.createViewModel(instruction).then(ins => {
          return this.createControllerAndSwap(ins);
        });
      }

      return this.createControllerAndSwap(instruction);
    } else if (instruction.view) {
      if (instruction.viewResources) {
        instruction.view.makeRelativeTo(instruction.viewResources.viewUrl);
      }

      return instruction.view.loadViewFactory(this.viewEngine, new ViewCompileInstruction()).then(viewFactory => {
        let removeResponse = instruction.viewSlot.removeAll(true);

        if (removeResponse instanceof Promise) {
          return removeResponse.then(() => {
            let result = viewFactory.create(instruction.childContainer, instruction.bindingContext);
            instruction.viewSlot.add(result);
            return result;
          });
        }

        let result = viewFactory.create(instruction.childContainer, instruction.bindingContext);
        instruction.viewSlot.add(result);
        return result;
      });
    } else if (instruction.viewSlot) {
      instruction.viewSlot.removeAll();
      return Promise.resolve(null);
    }
  }
}

export class ElementConfigResource {
  initialize() {}

  register() {}

  load(container, Target) {
    let config = new Target();
    let eventManager = container.get(EventManager);
    eventManager.registerElementConfig(config);
  }
}

function validateBehaviorName(name, type) {
  if (/[A-Z]/.test(name)) {
    throw new Error(`'${name}' is not a valid ${type} name.  Upper-case letters are not allowed because the DOM is not case-sensitive.`);
  }
}

export function resource(instance) {
  return function(target) {
    metadata.define(metadata.resource, instance, target);
  };
}

decorators.configure.parameterizedDecorator('resource', resource);

export function behavior(override) {
  return function(target) {
    if (override instanceof HtmlBehaviorResource) {
      metadata.define(metadata.resource, override, target);
    } else {
      let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, target);
      Object.assign(r, override);
    }
  };
}

decorators.configure.parameterizedDecorator('behavior', behavior);

export function customElement(name) {
  validateBehaviorName(name, 'custom element');
  return function(target) {
    let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, target);
    r.elementName = name;
  };
}

decorators.configure.parameterizedDecorator('customElement', customElement);

export function customAttribute(name, defaultBindingMode?) {
  validateBehaviorName(name, 'custom attribute');
  return function(target) {
    let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, target);
    r.attributeName = name;
    r.attributeDefaultBindingMode = defaultBindingMode;
  };
}

decorators.configure.parameterizedDecorator('customAttribute', customAttribute);

export function templateController(target) {
  let deco = function(t) {
    let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, t);
    r.liftsContent = true;
  };

  return target ? deco(target) : deco;
}

decorators.configure.simpleDecorator('templateController', templateController);

export function bindable(nameOrConfigOrTarget?, key?, descriptor?) {
  let deco = function(target, key2, descriptor2) {
    let actualTarget = key2 ? target.constructor : target; //is it on a property or a class?
    let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, actualTarget);
    let prop;

    if (key2) { //is it on a property or a class?
      nameOrConfigOrTarget = nameOrConfigOrTarget || {};
      nameOrConfigOrTarget.name = key2;
    }

    prop = new BindableProperty(nameOrConfigOrTarget);
    return prop.registerWith(actualTarget, r, descriptor2);
  };

  if (!nameOrConfigOrTarget) { //placed on property initializer with parens
    return deco;
  }

  if (key) { //placed on a property initializer without parens
    let target = nameOrConfigOrTarget;
    nameOrConfigOrTarget = null;
    return deco(target, key, descriptor);
  }

  return deco; //placed on a class
}

decorators.configure.parameterizedDecorator('bindable', bindable);

export function dynamicOptions(target) {
  let deco = function(t) {
    let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, t);
    r.hasDynamicOptions = true;
  };

  return target ? deco(target) : deco;
}

decorators.configure.simpleDecorator('dynamicOptions', dynamicOptions);

export function sync(selectorOrConfig) {
  return function(target, key, descriptor) {
    let actualTarget = key ? target.constructor : target; //is it on a property or a class?
    let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, actualTarget);

    if (typeof selectorOrConfig === 'string') {
      selectorOrConfig = {
        selector: selectorOrConfig,
        name: key
      };
    }

    r.addChildBinding(new ChildObserver(selectorOrConfig));
  };
}

decorators.configure.parameterizedDecorator('sync', sync);

export function useShadowDOM(target) {
  let deco = function(t) {
    let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, t);
    r.targetShadowDOM = true;
  };

  return target ? deco(target) : deco;
}

decorators.configure.simpleDecorator('useShadowDOM', useShadowDOM);

function doNotProcessContent() {
  return false;
}

export function processContent(processor) {
  return function(t) {
    let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, t);
    r.processContent = processor || doNotProcessContent;
  };
}

decorators.configure.parameterizedDecorator('processContent', processContent);

export function containerless(target) {
  let deco = function(t) {
    let r = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, t);
    r.containerless = true;
  };

  return target ? deco(target) : deco;
}

decorators.configure.simpleDecorator('containerless', containerless);

export function viewStrategy(strategy) {
  return function(target) {
    metadata.define(ViewStrategy.metadataKey, strategy, target);
  };
}

decorators.configure.parameterizedDecorator('viewStrategy', useView);

export function useView(path) {
  return viewStrategy(new UseViewStrategy(path));
}

decorators.configure.parameterizedDecorator('useView', useView);

export function inlineView(markup:string, dependencies?:Array<string|Function|Object>, dependencyBaseUrl?:string) {
  return viewStrategy(new InlineViewStrategy(markup, dependencies, dependencyBaseUrl));
}

decorators.configure.parameterizedDecorator('inlineView', inlineView);

export function noView(target) {
  let deco = function(t) {
    metadata.define(ViewStrategy.metadataKey, new NoViewStrategy(), t);
  };

  return target ? deco(target) : deco;
}

decorators.configure.simpleDecorator('noView', noView);

export function elementConfig(target) {
  let deco = function(t) {
    metadata.define(metadata.resource, new ElementConfigResource(), t);
  };

  return target ? deco(target) : deco;
}

decorators.configure.simpleDecorator('elementConfig', elementConfig);

export const templatingEngine = {
  initialize(container?: Container) {
    this._container = container || new Container();
    this._moduleAnalyzer = this._container.get(ModuleAnalyzer);
    bindingEngine.initialize(this._container);
  },
  createModelForUnitTest(modelType: Function, attributesFromHTML?: Object, bindingContext?: any): Object {
    let exportName = modelType.name;
    let resourceModule = this._moduleAnalyzer.analyze('test-module', { [exportName]: modelType }, exportName);
    let description = resourceModule.mainResource;

    description.initialize(this._container);

    let model = this._container.get(modelType);
    let controller = new Controller(description.metadata, model, {attributes: attributesFromHTML || {}});

    controller.bind(bindingContext || {});

    return model;
  }
};

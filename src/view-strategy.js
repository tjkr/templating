import {metadata, Origin} from 'aurelia-metadata';
import {relativeToFile} from 'aurelia-path';
import {TemplateRegistryEntry} from 'aurelia-loader';
import {ViewEngine} from './view-engine';
import {ResourceLoadContext, ViewCompileInstruction} from './instructions';
import {DOM} from 'aurelia-pal';

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

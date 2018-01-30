import {Observer} from 'rxjs/Observer';
import {Observable} from 'rxjs/Observable';
import {IdaiFieldDocument} from 'idai-components-2/idai-field-model';
import {ResourcesState} from './resources-state';
import {NavigationPath} from './navigation-path';
import {ModelUtil} from '../../../core/model/model-util';
import {IdaiFieldDocumentReadDatastore} from '../../../core/datastore/idai-field-document-read-datastore';
import {ObserverUtil} from '../../../util/observer-util';
import {includedIn, takeUntil} from '../../../util/list-util';
import {NavigationPathInternal, NavigationPathSegment, isSegmentOf, toDocument} from './navigation-path-internal';


/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export class NavigationPathManager {

    private navigationPathObservers: Array<Observer<NavigationPath>> = [];


    constructor(private resourcesState: ResourcesState,
                private datastore: IdaiFieldDocumentReadDatastore) {
    }


    public navigationPathNotifications = (): Observable<NavigationPath> => ObserverUtil.register(this.navigationPathObservers);


    /**
     * @param document set undefined to make rootElement of navigation path undefined
     */
    public moveInto(document: IdaiFieldDocument|undefined) {

        const result: NavigationPathInternal = NavigationPathManager.makeNewNavigationPath(
            this.resourcesState.getNavigationPathInternal(), document);

        this.resourcesState.setNavigationPathInternal(result);

        ObserverUtil.notify(this.navigationPathObservers, this.getNavigationPath());
    }


    public setMainTypeDocument(selectedMainTypeDocumentResource: IdaiFieldDocument | undefined) {

        if (!selectedMainTypeDocumentResource) return;
        this.resourcesState.setMainTypeDocument(selectedMainTypeDocumentResource);

        ObserverUtil.notify(this.navigationPathObservers, this.getNavigationPath());
    }


    public async updateNavigationPathForDocument(document: IdaiFieldDocument) {

        if (!this.isCorrectNavigationPathFor(document)) {
            await this.createNavigationPathForDocument(document);
        }
    }


    public getNavigationPath(): NavigationPath {

        if (this.resourcesState.isInOverview()) return NavigationPath.empty();

        const mainTypeDocument = this.resourcesState.getMainTypeDocument();
        if (!mainTypeDocument) return NavigationPath.empty();

        return {
            elements: this.resourcesState.getNavigationPathInternal().elements.map(toDocument),
            rootDocument: this.resourcesState.getNavigationPathInternal().rootDocument
        }
    }


    private isCorrectNavigationPathFor(document: IdaiFieldDocument): boolean {

        const navigationPath = this.getNavigationPath();

        if (navigationPath.rootDocument && ModelUtil.hasRelationTarget(document, 'liesWithin',
                navigationPath.rootDocument.resource.id as string)) {
            return true;
        }

        const mainTypeDocument = this.resourcesState.getMainTypeDocument();

        return (!navigationPath.rootDocument && (mainTypeDocument != undefined)
                && ModelUtil.hasRelationTarget(document, 'isRecordedIn',
                    mainTypeDocument.resource.id as string)
                && !ModelUtil.hasRelations(document, 'liesWithin'));
    }


    private async createNavigationPathForDocument(document: IdaiFieldDocument) {

        const elements: Array<IdaiFieldDocument> = [];

        let currentResourceId = ModelUtil.getRelationTargetId(document, 'liesWithin', 0);
        while (currentResourceId) {
            const currentDocument: IdaiFieldDocument = await this.datastore.get(currentResourceId);
            elements.unshift(currentDocument);
            currentResourceId = ModelUtil.getRelationTargetId(currentDocument, 'liesWithin', 0);
        }

        if (elements.length == 0) {
            this.moveInto(undefined);
        } else {
            this.setNavigationPath({ elements: elements, rootDocument: elements[elements.length - 1]});
        }
    }


    private setNavigationPath(newNavigationPath: NavigationPath) {

        const currentNavigationPath: NavigationPathInternal
            = this.resourcesState.getNavigationPathInternal();
        const currentNavigationPathResourceIds: Array<string> = currentNavigationPath.elements
            .map(element => element.document.resource.id as string);

        const result: NavigationPathInternal = {
            elements: [],
            rootDocument: newNavigationPath.rootDocument,
            q: currentNavigationPath.q,
            types: currentNavigationPath.types
        };

        if (!newNavigationPath.rootDocument ||
            currentNavigationPathResourceIds.indexOf(newNavigationPath.rootDocument.resource.id as string) > -1) {
            result.elements = currentNavigationPath.elements;
        } else {
            for (let document of newNavigationPath.elements) {
                const index: number = currentNavigationPathResourceIds.indexOf(document.resource.id as string);
                result.elements.push(index > -1 ?
                    currentNavigationPath.elements[index] :
                    {document: document}
                );
            }
        }

        this.resourcesState.setNavigationPathInternal(result);

        ObserverUtil.notify(this.navigationPathObservers, this.getNavigationPath());
    }


    private static makeNewNavigationPath(
        oldNavigationPath: NavigationPathInternal,
        newRootDocument: IdaiFieldDocument|undefined): NavigationPathInternal {

        return {
            elements: newRootDocument
                ? this.rebuildElements(
                    oldNavigationPath.elements,
                    oldNavigationPath.rootDocument,
                    newRootDocument)
                : oldNavigationPath.elements,
            rootDocument: newRootDocument,
            q: oldNavigationPath.q,
            types: oldNavigationPath.types
        };
    }


    private static rebuildElements(oldSegments: Array<NavigationPathSegment>,
                                   oldRootDocument: IdaiFieldDocument|undefined,
                                   newRootDocument: IdaiFieldDocument) {

        return oldSegments.map(toDocument).includes(newRootDocument)
            ? oldSegments
            : (oldRootDocument
                    ? takeUntil(isSegmentOf(oldRootDocument))(oldSegments)
                    : []
                ).concat([{document: newRootDocument}]);
    }
}


import {Query, ReadDatastore, Datastore, DatastoreErrors} from "idai-components-2/datastore";
import {Document} from "idai-components-2/core";
import {ConfigLoader, ProjectConfiguration} from "idai-components-2/configuration";
import {IdGenerator} from "./id-generator";
import {Observable} from "rxjs/Observable";
import {M} from "../m";
import {IdaiFieldDatastore} from "./idai-field-datastore";
import {SyncState} from "./sync-state";
import {IdaiFieldDocument} from 'idai-components-2/idai-field-model';
import {PouchdbManager} from "./pouchdb-manager";

/**
 * @author Sebastian Cuy
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export class PouchdbDatastore implements IdaiFieldDatastore {

    private static MSG_ID_EXISTS_IN_CREATE: string = 'Aborting creation: document.id already exists. ' +
        'Maybe you wanted to update the object with update()?';

    protected db: any;
    private observers = [];
    private config: ProjectConfiguration;
    private syncHandles = [];

    constructor(configLoader: ConfigLoader, private pouchdbManager: PouchdbManager) {

        this.db = pouchdbManager.getDb();
        configLoader.getProjectConfiguration()
            .then(config => this.config = config, () => {})
            .then(() => this.setupServer())
            .then(() => this.setupChangesEmitter())

    }

    /**
     * Implements {@link Datastore#create}.
     * @param document
     * @param initial
     * @returns {Promise<Document>} same instance of the document
     */
    public create(document: Document, initial: boolean = false): Promise<Document> {

        let reset = this.resetDocOnErr(document);

        return this.proveThatDoesNotExist(document)
            .then(() => {

                if (!document.resource.id) {
                    document.resource.id = IdGenerator.generateId();
                }
                document['_id'] = document.resource.id;
                document.resource['_parentTypes'] = this.config
                    .getParentTypes(document.resource.type);

                return this.db.put(document).catch(
                    err => {
                        console.error(err);
                        return Promise.reject(DatastoreErrors.GENERIC_SAVE_ERROR);
                    }
                );
            })
            .then(result => {

                document['_rev'] = result['rev'];
                return Promise.resolve(this.cleanDoc(document));

            }).catch(keyOfM => {

                reset(document);
                return Promise.reject([keyOfM]);
            })
    }

    /**
     * Implements {@link Datastore#update}.
     * @param document
     * @returns {Promise<Document>} same instance of the document
     */
    public update(document: Document): Promise<Document> {

        if (document.resource.id == null) {
            return <any> Promise.reject([DatastoreErrors.DOCUMENT_NO_RESOURCE_ID]);
        }

        const reset = this.resetDocOnErr(document);
        return this.get(document.resource.id).then(() => {
                document['_id'] = document.resource.id;
                document.resource['_parentTypes'] = this.config
                    .getParentTypes(document.resource.type);

                return this.db.put(document).then(result => {

                    document['_rev'] = result['rev'];
                    return Promise.resolve(this.cleanDoc(document));

                }).catch(err => {

                    let errType = DatastoreErrors.GENERIC_SAVE_ERROR;
                    if (err.name && err.name == 'conflict')
                        errType = DatastoreErrors.SAVE_CONFLICT;
                    reset(document);
                    return Promise.reject([errType]);

                })
            },
            () => {
                return Promise.reject([DatastoreErrors.DOCUMENT_DOES_NOT_EXIST_ERROR]);
            }
        );
    }

    private resetDocOnErr(original: Document) {
        let created = original.created;
        let modified = original.modified;
        let id = original.resource.id;
        return function(document: Document) {
            delete document['_id'];
            delete document.resource['_parentTypes'];
            document.resource.id = id;
            document.created = created;
            document.modified = modified;
        }
    }

    /**
     * Implements {@link ReadDatastore#refresh}.
     *
     * @param doc
     * @returns {Promise<Document>}
     */
    public refresh(doc: Document): Promise<Document> {
        return this.fetchObject(doc.resource.id)
            .then(doc => this.cleanDoc(doc));
    }

    /**
     * Implements {@link ReadDatastore#get}.
     *
     * @param resourceId
     * @returns {Promise<Document>}
     */
    public get(resourceId: string): Promise<Document> {
        return this.fetchObject(resourceId)
            .then(doc => this.cleanDoc(doc));
    }

    /**
     * Implements {@link Datastore#remove}.
     *
     * @param doc
     * @returns {Promise<undefined>}
     */
    public remove(doc: Document): Promise<undefined> {

        if (doc.resource.id == null) {
            return <any> Promise.reject([DatastoreErrors.DOCUMENT_NO_RESOURCE_ID]);
        }

        return this.get(doc.resource.id).then(
            () => this.db.remove(doc)
                .catch(() => Promise.reject([DatastoreErrors.GENERIC_DELETE_ERROR])),
            () => Promise.reject([DatastoreErrors.DOCUMENT_DOES_NOT_EXIST_ERROR])
        );
    }

    /**
     * Implements {@link IdaiFieldDatastore#getLatestRevision}.
     *
     * @param id
     * @returns {Promise<Document>}
     */
    getLatestRevision(id: string): Promise<IdaiFieldDocument> {
        return this.get(id);
    }

    /**
     * Implements {@link IdaiFieldDatastore#getRevision}.
     *
     * @param resourceId
     * @param revisionId
     * @returns {Promise<Document>}
     */
    public getRevision(docId: string, revisionId: string): Promise<IdaiFieldDocument> {
        return this.fetchRevision(docId, revisionId)
            .then(doc => this.cleanDoc(doc));
    }

    /**
     * Implements {@link IdaiFieldDatastore#removeRevision}.
     *
     * @param resourceId
     * @param revisionId
     * @returns {Promise<any>}
     */
    public removeRevision(docId: string, revisionId: string): Promise<any> {

        return this.db.remove(docId, revisionId)
            .catch(err => {
                console.error(err);
                return Promise.reject([M.DATASTORE_GENERIC_ERROR]);
            });
    }

    public shutDown(): Promise<void> {
        return this.db.destroy();
    }

    public documentChangesNotifications(): Observable<Document> {

        return Observable.create( observer => {
            this.observers.push(observer);
        });
    }

    /**
     * Implements {@link ReadDatastore#find}.
     */
    public find(query: Query,
                offset: number=0,
                limit: number=-1): Promise<Document[]> {

        if (!query) return Promise.resolve([]);

        let impl: Promise<Document[]>;
        if (!query.constraints) {
            impl = this.simpleFind(query,offset,limit);
        } else {
            impl = this.findWithConstraints(query,offset,limit);
        }
        return impl.catch(err=>{
            console.error(err);
            return Promise.reject([M.DATASTORE_GENERIC_ERROR]);
        })
    }

    private buildConstraintQueries(query) {
        const queries = [];
        for (let constraint in query.constraints) {
            const opt = {
                reduce: false,
                include_docs: false,
                conflicts: true,
                startkey: 'UNKOWN',
                endkey: 'UNKOWN'+'\uffff'
            };
            if (query.constraints[constraint] != undefined) {
                opt['startkey'] = query.constraints[constraint];
                opt['endkey'] = query.constraints[constraint]+'\uffff';
            }
            queries.push(this.db.query(constraint, opt))
        }
        return Promise.all(queries)
            .then(results => {
                for (let i in results) {
                    results[i] = results[i].rows.map(r => r.id)
                }
                return results;
            });
    }

    private intersectResults(results) {
        let rows = [];
        for (let result of results) {
            let row = [];
            for (let column of result) {
                row.push(column)
            }
            rows.push(row)
        }
        return rows.reduce((p,c) => p.filter(e => c.includes(e)))
    }

    private matchInnerAndOuter(innerResults,outerResults) {
        const results = [];
        for (let outerResult of outerResults) {
            let existsAsInnerResult = false;
            for (let innerResult of innerResults) {
                if (!outerResult) continue;
                if (innerResult == outerResult) {
                    existsAsInnerResult = true;
                }
            }
            if (existsAsInnerResult) {
                results.push(outerResult);
            }
        }
        return results;
    }

    private findWithConstraints(query, offset, limit) {

        return this.buildConstraintQueries(query)
            .then(results => this.intersectResults(results))
            .then(outerResults => {

                return this.simpleFind(query,undefined,undefined,false)
                    .then(innerResults => {

                        let proms = [];
                        for (let r of this.matchInnerAndOuter(innerResults,outerResults)) {
                            proms.push(this.fetchObject(r));
                        }
                        // TODO respect offset and limit
                        // TODO filter innerResults
                        return Promise.all(proms);
                    })
            });
    }

    private simpleFind(query, offset, limit, include_docs = true) {
        const opt = {
            reduce: false,
            include_docs: include_docs,
            conflicts: true,
        };

        let q = query.q ? query.q.toLowerCase() : '';
        let type = query.type ? query.type : '';

        opt['startkey'] = [type, q];
        let endKey = query.prefix ? q + '\uffff' : q;
        opt['endkey'] = [type, endKey];
        // performs poorly according to PouchDB documentation
        // could be replaced by using startKey instead
        // (see http://docs.couchdb.org/en/latest/couchapp/views/pagination.html)
        if (offset) opt['skip'] = offset;
        if (limit > -1) opt['limit'] = limit;

        return this.db.query('fulltext', opt)
            .then(result => {
                if (include_docs) {
                    return this.filterResult(this.docsFromResult(result))
                } else {
                    return result.rows.map(r => r.id);
                }
            });
    }


    public findUnsynced(): Promise<Document[]> {

        return this.db.query('synced', {
            key: 0,
            include_docs: true,
            conflicts: true,
        }).then(result => {
            return Promise.resolve(result.rows.map(result=>this.cleanDoc(result.doc)));
        });
    }

    public findConflicted(): Promise<IdaiFieldDocument[]> {

        return this.db.query('conflicted', {
            include_docs: true,
            conflicts: true,
            descending: true
        }).then(result => {
            return Promise.resolve(result.rows.map(result=>this.cleanDoc(result.doc)));
        });
    }

    public findByIdentifier(identifier: string): Promise<IdaiFieldDocument> {

        if (identifier == undefined) return Promise.reject([M.DATASTORE_NOT_FOUND]);

        return this.db.query('identifier', {
            key: identifier,
            include_docs: true,
            conflicts: true,
        }).then(result => {
           if (result.rows.length > 0) {
               return Promise.resolve(this.cleanDoc(result.rows[0].doc));
           } else {
               return Promise.reject([M.DATASTORE_NOT_FOUND]);
           }
        });
    }

    /**
     * Implements {@link ReadDatastore#all}.
     */
    public all(type:string='',
               offset:number=0,
               limit:number=-1): Promise<Document[]> {

        let opt = {
            include_docs: true,
            startkey: [type, {}],
            endkey: [type],
            descending: true,
            conflicts: true,
        };
        // performs poorly according to PouchDB documentation
        // could be replaced by using startKey instead
        // (see http://docs.couchdb.org/en/latest/couchapp/views/pagination.html)
        if (offset) opt['skip'] = offset;
        if (limit > -1) opt['limit'] = limit;

        return this.db.query('all', opt)
            .then(result => this.filterResult(this.docsFromResult(result)));
    }

    public setupSync(url: string): Promise<SyncState> {

            let fullUrl = url + '/' + this.pouchdbManager.getName();
            console.log("start syncing with " + fullUrl);

            return this.db.rdy.then(db => {
                let sync = db.sync(fullUrl, { live: true, retry: false });
                this.syncHandles.push(sync);
                return {
                    url: url,
                    cancel: () => sync.cancel(),
                    onError: Observable.create(obs => sync.on('error', err => obs.next(err))),
                    onChange: Observable.create(obs => sync.on('change', () => obs.next()))
                };
            });
    }

    public stopSync() {

        for (let handle of this.syncHandles) {
            console.debug("stop sync",handle);
            handle.cancel();
        }
        this.syncHandles = [];
    }

    protected setupServer() {
        return Promise.resolve();
    }

    /**
     * @param doc
     * @return resolve when document with the given resource id does not exist already, reject otherwise
     */
    private proveThatDoesNotExist(doc:Document): Promise<any> {
        if (doc.resource.id) {
            return this.fetchObject(doc.resource.id)
                .then(result => Promise.reject(M.DATASTORE_RESOURCE_ID_EXISTS), () => Promise.resolve())
        } else return Promise.resolve();
    }

    private fetchObject(id: string): Promise<Document> {
        // Beware that for this to work we need to make sure
        // the document _id/id and the resource.id are always the same.
        return this.db.get(id, { conflicts: true })
            .catch(err => Promise.reject([M.DATASTORE_NOT_FOUND]))
    }

    private fetchRevision(docId: string, revisionId: string): Promise<Document> {
        return this.db.get(docId, { rev: revisionId })
            .catch(err => Promise.reject([M.DATASTORE_NOT_FOUND]))
    }

    private docsFromResult(result: any[]): Document[] {
        return result['rows'].map(row => this.cleanDoc(row.doc));
    }

    // strips document of any properties that are only
    // used to simplify index creation
    private cleanDoc(doc: Document): Document {

        if (doc && doc.resource) {
            delete doc.resource['_parentTypes'];
        }
        return doc;
    }

    // only return every doc once by using Set
    private filterResult(docs: Document[]): Document[] {

        const set: Set<string> = new Set<string>();
        let filtered = [];
        docs.forEach(doc => {
            if (!set.has(doc.resource.id)) {
                set.add(doc.resource.id);
                filtered.push(doc);
            }
        });
        return filtered;
    }

    private setupChangesEmitter(): void {

        this.db.rdy.then(db => {
            db.changes({
                live: true,
                include_docs: true,
                conflicts: true,
                since: 'now'
            }).on('change', change => {
                if (change && change['id'] && (change['id'].indexOf('_design') == 0)) return; // starts with _design
                if (!change || !change.doc) return;
                if (this.observers && Array.isArray(this.observers)) this.observers.forEach(observer => {
                    if (observer && (observer.next != undefined)) {
                        observer.next(this.cleanDoc(change.doc));
                    }
                });
            }).on('complete', info => {
                console.error("changes stream was canceled", info);
            }).on('error', err => {
                console.error("changes stream errored", err);
            });
        });
    }
}

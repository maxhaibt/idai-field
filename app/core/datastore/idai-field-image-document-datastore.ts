import {PouchdbDatastore} from "./core/pouchdb-datastore";
import {DocumentCache} from "./core/document-cache";
import {IdaiFieldImageDocument} from "../model/idai-field-image-document";
import {DocumentConverter} from "./core/document-converter";
import {IdaiFieldDatastore} from "./idai-field-datastore";
import {CachedDatastore} from "./core/cached-datastore";

/**
 * @author Daniel de Oliveira
 */
export class IdaiFieldImageDocumentDatastore
    extends CachedDatastore<IdaiFieldImageDocument>
    implements IdaiFieldDatastore {

    constructor(
        datastore: PouchdbDatastore,
        documentCache: DocumentCache<IdaiFieldImageDocument>,
        documentConverter: DocumentConverter) {

        super(datastore, documentCache, documentConverter, 'IdaiFieldImageDocument');
    }

    // TODO intercept and handle every call that tries to access or modify non image documents

    // TODO make that query is only for image document types. throw exception if tried otherwise
    public find(query: any): Promise<IdaiFieldImageDocument[]> {

        return super.find(query).then(result => {

            return result;
        })
    }
}
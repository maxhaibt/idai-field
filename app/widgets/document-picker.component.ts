import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {Query} from 'idai-components-2/core';
import {IdaiFieldDocument} from 'idai-components-2/field';
import {ProjectConfiguration} from 'idai-components-2/core';
import {IdaiFieldDocumentDatastore} from '../core/datastore/idai-field-document-datastore';

@Component({
    selector: 'document-picker',
    moduleId: module.id,
    templateUrl: './document-picker.html'
})
/**
 * @author Sebastian Cuy
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 */
export class DocumentPickerComponent implements OnChanges {

    @Input() relationName: string;
    @Input() relationRangeType: string;

    @Output() documentSelected: EventEmitter<IdaiFieldDocument> = new EventEmitter<IdaiFieldDocument>();

    public documents: Array<IdaiFieldDocument>;
    protected query: Query = {};

    private fetchDocsRunning = false;


    constructor(private datastore: IdaiFieldDocumentDatastore,
                private projectConfiguration: ProjectConfiguration) {

        this.query = {};
        this.fetchDocuments();
    }


    ngOnChanges() {

        this.fetchDocuments();
    }


    public setQueryString(q: string) {

        this.query.q = q;
        this.fetchDocuments();
    }


    public setQueryTypes(types: string[]) {

        if (types && types.length > 0) {
            this.query.types = types;
        } else {
            delete this.query.types;
        }
        this.fetchDocuments();
    }


    /**
     * Populates the document list with all documents
     * from the datastore which match the current query.
     */
    public fetchDocuments() { // TODO make private

        if (this.fetchDocsRunning) return;
        this.fetchDocsRunning = true;

        this.datastore.find(this.query)
            .then(result => {
                this.documents = this.filterNotAllowedRelationDomainTypes(result.documents);
                this.fetchDocsRunning = false;
            },
            err => console.error(err));
    }


    private filterNotAllowedRelationDomainTypes(documents: Array<IdaiFieldDocument>): Array<IdaiFieldDocument> {

        const result: Array<IdaiFieldDocument> = [];

        for (let document of documents) {

            if (this.projectConfiguration.isAllowedRelationDomainType(
                    document.resource.type,
                    this.relationRangeType,
                    this.relationName)) {

                result.push(document);
            }
        }

        return result;
    }
}
import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {FieldDocument} from 'idai-components-2';
import {ResourcesComponent} from '../resources.component';
import {Loading} from '../../widgets/loading';
import {BaseList} from '../base-list';
import {ProjectConfiguration} from '../../../core/configuration/project-configuration';
import {Category} from '../../../core/configuration/model/category';
import {ViewFacade} from '../../../core/resources/view/view-facade';
import {namedArrayToNamedMap} from 'src/app/core/util/named';


@Component({
    selector: 'list',
    templateUrl: './list.html'
})
/**
 * @author Fabian Z.
 * @author Thomas Kleinke
 * @author Philipp Gerth
 */
export class ListComponent extends BaseList implements OnChanges {

    @Input() documents: Array<FieldDocument>;
    @Input() selectedDocument: FieldDocument;

    public categoriesMap: { [category: string]: Category };


    constructor(resourcesComponent: ResourcesComponent,
                viewFacade: ViewFacade,
                loading: Loading,
                projectConfiguration: ProjectConfiguration) {

        super(resourcesComponent, viewFacade, loading);
        this.categoriesMap = namedArrayToNamedMap(projectConfiguration.getCategoriesArray());
    }


    public ngOnChanges(changes: SimpleChanges) {

        if (changes['selectedDocument']) this.scrollTo(this.selectedDocument);
    }


    public trackDocument = (index: number, item: FieldDocument) => item.resource.id;


    public async createNewDocument(doc: FieldDocument) {

        this.documents = this.documents
            .filter(_ => _.resource.id)
            .concat([doc]);
    }
}

import {Component} from '@angular/core';
import {NgbActiveModal, NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {on, is} from 'tsfun';
import {Datastore, Document, FieldDocument, ImageDocument} from 'idai-field-core';
import {RoutingService} from '../../routing-service';
import {ImagesState} from '../../../core/images/overview/view/images-state';
import {ViewModalComponent} from '../view-modal.component';
import {ImageRowItem} from '../../../core/images/row/image-row';
import {MenuService} from '../../menu-service';
import {ImagePickerComponent} from '../../docedit/widgets/image-picker.component';
import {ImageRelationsManager} from '../../../core/model/image-relations-manager';


@Component({
    templateUrl: './image-view-modal.html',
    host: {
        '(window:keydown)': 'onKeyDown($event)'
    }
})
/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export class ImageViewModalComponent extends ViewModalComponent {

    public linkedDocument: Document;


    constructor(private imagesState: ImagesState,
                activeModal: NgbActiveModal,
                modalService: NgbModal,
                routingService: RoutingService,
                menuService: MenuService,
                private datastore: Datastore,
                private imageRelationsManager: ImageRelationsManager) {

        super(activeModal, modalService, routingService, menuService);
    }


    public getExpandAllGroups = () => this.imagesState.getExpandAllGroups();

    public setExpandAllGroups = (expand: boolean) => this.imagesState.setExpandAllGroups(expand);

    protected getDocument = () => (this.selectedImage as ImageRowItem).document;

    protected setDocument = (document: Document) => (this.selectedImage as ImageRowItem).document = document;


    public async initialize(documents?: Array<ImageDocument>,
                            selectedDocument?: ImageDocument,
                            linkedDocument?: Document) {

        this.linkedDocument = linkedDocument;
        const docs = documents ?? await this.getImageDocuments(linkedDocument?.resource.relations.isDepictedIn);
        this.images = docs.map(ImageRowItem.ofDocument);
        selectedDocument = selectedDocument ?? docs.length > 0 ? docs[0] : undefined;

        if (selectedDocument) {
            this.selectedImage = this.images.find(
                on(ImageRowItem.IMAGE_ID, is(selectedDocument.resource.id))
            );
        }
    }

    public onContextMenuItemClicked(event: any) {

        console.log('TODO', 'onContextMenuItemClicked', event);
    }


    public async startEditImages() {

        // this.menuService.setContext(MenuContext.DOCEDIT);

        const imagePickerModal: NgbModalRef = this.modalService.open(
            ImagePickerComponent, { size: 'lg', keyboard: false }
        );
        imagePickerModal.componentInstance.mode = 'depicts';
        imagePickerModal.componentInstance.setDocument(this.linkedDocument);

        try {
            const selectedImages: Array<ImageDocument> = await imagePickerModal.result;
            await this.imageRelationsManager.link(this.linkedDocument as FieldDocument, ...selectedImages);
            this.linkedDocument = await this.datastore.get(this.linkedDocument.resource.id);
            this.images = (await this.getImageDocuments(this.linkedDocument.resource.relations.isDepictedIn))
                .map(ImageRowItem.ofDocument);
        } catch {
            // Image picker modal has been canceled
        } finally {
            // this.menuService.setContext(MenuContext.DOCEDIT);
        }
    }


    private async getImageDocuments(relations: string[]|undefined): Promise<Array<ImageDocument>> {

        return relations
            ? (await this.datastore.getMultiple(relations)) as Array<ImageDocument>
            : [];
    }
}

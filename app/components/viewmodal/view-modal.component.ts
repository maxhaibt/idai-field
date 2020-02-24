import {DoCheck, ElementRef, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {NgbActiveModal, NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {Messages, Document, FieldDocument} from 'idai-components-2';
import {DoceditComponent} from '../docedit/docedit.component';
import {RoutingService} from '../routing-service';
import {ImageReadDatastore} from '../../core/datastore/field/image-read-datastore';
import {MenuService} from '../../desktop/menu-service';
import {ImageRowItem} from '../image/row/image-row.component';


/**
 * @author Thomas Kleinke
 */
export abstract class ViewModalComponent implements DoCheck {

    @ViewChild('resourceInfo', { static: false }) resourceInfo: ElementRef;

    public images: Array<ImageRowItem> = [];
    public selectedImage: ImageRowItem;

    public openSection: string|undefined = 'stem';
    public expandAllGroups: boolean = false;
    public resourceInfoScrollbarVisible: boolean = false;

    private subModalOpened: boolean = false;


    constructor(protected datastore: ImageReadDatastore,
                private activeModal: NgbActiveModal,
                private messages: Messages,
                private router: Router,
                private modalService: NgbModal,
                private routingService: RoutingService) {}


    ngDoCheck() {

        this.resourceInfoScrollbarVisible = this.isResourceInfoScrollbarVisible();
    }


    protected abstract getDocument(isImageDocument?: boolean): Document;

    protected abstract setDocument(document: Document, isImageDocument?: boolean): void;


    public async onKeyDown(event: KeyboardEvent) {

        if (event.key === 'Escape' && !this.subModalOpened) await this.activeModal.close();
    }


    public async onSelected(selectedImage: ImageRowItem) {

        this.selectedImage = selectedImage;
    }


    public setOpenSection(section: string) {

        this.openSection = section;
        this.expandAllGroups = false;
    }


    public close() {

        this.activeModal.close();
    }


    public async startEdit(isImageDocument?: boolean) {

        this.subModalOpened = true;
        MenuService.setContext('docedit');

        const doceditModalRef = this.modalService.open(
            DoceditComponent,
            { size: 'lg', backdrop: 'static' }
        );
        const doceditModalComponent = doceditModalRef.componentInstance;
        doceditModalComponent.setDocument(this.getDocument(isImageDocument), isImageDocument);

        try {
            const result = await doceditModalRef.result;
            if (result.document) this.setDocument(result.document, isImageDocument);
        } catch (closeReason) {
            if (closeReason === 'deleted') await this.activeModal.close();
        }

        this.subModalOpened = false;
        MenuService.setContext('view-modal');
    }


    public async jumpToResource(documentToJumpTo: FieldDocument) {

        await this.routingService.jumpToResource(documentToJumpTo, true);
        this.activeModal.close();
    }


    private isResourceInfoScrollbarVisible(): boolean {

        return this.resourceInfo
            && this.resourceInfo.nativeElement.scrollHeight
            > this.resourceInfo.nativeElement.clientHeight;
    }
}

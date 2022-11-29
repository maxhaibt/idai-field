import { Component, Input, Output, ElementRef, ViewChild, EventEmitter } from '@angular/core';
import { Document, Resource, Named, FieldDocument, Groups, ProjectConfiguration, Datastore,
    Hierarchy } from 'idai-field-core';


@Component({
    selector: 'document-info',
    templateUrl: './document-info.html'
})
/**
 * @author Thomas Kleinke
 */
export class DocumentInfoComponent {

    @ViewChild('documentInfo', { static: false }) documentInfoElement: ElementRef;

    @Input() document: Document;
    @Input() getExpandAllGroups: () => boolean;
    @Input() setExpandAllGroups: (expandAllGroups: boolean) => void;
    @Input() showThumbnail: boolean = false;
    @Input() showCloseButton: boolean = false;
    @Input() transparentBackground: boolean = false;

    @Output() onStartEdit: EventEmitter<void> = new EventEmitter<void>();
    @Output() onJumpToResource: EventEmitter<FieldDocument> = new EventEmitter<FieldDocument>();
    @Output() onThumbnailClicked: EventEmitter<void> = new EventEmitter<void>();
    @Output() onCloseButtonClicked: EventEmitter<void> = new EventEmitter<void>();

    public openSection: string|undefined = Groups.STEM;


    constructor(private projectConfiguration: ProjectConfiguration,
                private datastore: Datastore) {}


    public startEdit = () => this.onStartEdit.emit();

    public jumpToResource = (document: FieldDocument) => this.onJumpToResource.emit(document);

    public close = () => this.onCloseButtonClicked.emit();

    public clickThumbnail = () => this.onThumbnailClicked.emit();

    public isReadonly = () => this.document.project !== undefined;


    public toggleExpandAllGroups() {

        this.setExpandAllGroups(!this.getExpandAllGroups());
    }


    public setOpenSection(section: string) {

        this.openSection = section;
        this.setExpandAllGroups(false);
    }


    public isImageDocument() {

        return this.projectConfiguration.getImageCategories().map(Named.toName)
            .includes(this.document.resource.category);
    }


    public isThumbnailShown(): boolean {

        return this.showThumbnail && Document.hasRelations(this.document, 'isDepictedIn');
    }
}

import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {RouterModule} from '@angular/router';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {IdaiDocumentsModule} from 'idai-components-2/core';
import {IdaiWidgetsModule} from 'idai-components-2/widgets';
import {IdaiMessagesModule} from 'idai-components-2/core';
import {ImageGridComponent} from './image-grid.component';
import {DropAreaComponent} from './drop-area.component';
import {ImageGridBuilder} from './image-grid-builder';
import {ImageUploadModule} from '../imageupload/image-upload.module';
import {ImageGridCellComponent} from "./image-grid-cell.component";

@NgModule({
    imports: [
        BrowserModule,
        NgbModule,
        FormsModule,
        IdaiWidgetsModule,
        IdaiDocumentsModule,
        RouterModule,
        IdaiMessagesModule,
        ImageUploadModule
    ],
    declarations: [
        ImageGridComponent,
        ImageGridCellComponent,
        DropAreaComponent
    ],
    providers: [
        ImageGridBuilder
    ],
    exports: [
        ImageGridComponent, // export necessary?
    ]
})

export class ImageGridModule { }
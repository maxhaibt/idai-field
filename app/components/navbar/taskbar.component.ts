import {ChangeDetectorRef, Component} from '@angular/core';
import {Router} from '@angular/router';
import {RemoteChangesStream} from '../../core/datastore/core/remote-changes-stream';
import {SynchronizationStatus} from '../../core/settings/synchronization-status';
import {TabManager} from '../tab-manager';


@Component({
    moduleId: module.id,
    selector: 'taskbar',
    templateUrl: './taskbar.html'
})
/**
 * @author Sebastian Cuy
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 */
export class TaskbarComponent {

    public receivingRemoteChanges: boolean = false;

    private remoteChangesTimeout: any = undefined;


    constructor(private changeDetectorRef: ChangeDetectorRef,
                private synchronizationStatus: SynchronizationStatus,
                private router: Router,
                private tabManager: TabManager,
                remoteChangesStream: RemoteChangesStream) {

        this.listenToRemoteChanges(remoteChangesStream);
    }


    public isConnected = (): boolean => this.synchronizationStatus.isConnected();


    public async openTab(tabName: string) {

        await this.tabManager.openTab(tabName, tabName);
        await this.router.navigate([tabName]);
    }


    private listenToRemoteChanges(remoteChangesStream: RemoteChangesStream) {

        remoteChangesStream.notifications().subscribe(() => {
            this.receivingRemoteChanges = true;
            this.changeDetectorRef.detectChanges();

            if (this.remoteChangesTimeout) clearTimeout(this.remoteChangesTimeout);
            this.remoteChangesTimeout = setTimeout(() => {
                this.receivingRemoteChanges = false;
                this.changeDetectorRef.detectChanges();
            }, 2000);
        });
    }
}
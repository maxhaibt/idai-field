import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {Messages} from 'idai-components-2';
import {SettingsService} from '../../core/settings/settings-service';
import {DoceditComponent} from '../docedit/docedit.component';
import {M} from '../m';
import {ProjectNameValidator} from '../../common/project-name-validator';

const remote = require('electron').remote;

@Component({
    selector: 'projects',
    moduleId: module.id,
    templateUrl: './projects.html'
})
/**
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 */
export class ProjectsComponent implements OnInit {

    public selectedProject: string;
    public newProject: string = '';
    public projectToDelete: string = '';

    @ViewChild('projectsModalTemplate') public modalTemplate: TemplateRef<any>;

    private modalRef: NgbModalRef;


    constructor(private settingsService: SettingsService,
                private modalService: NgbModal,
                private messages: Messages) {
    }


    public getProjects = () => this.settingsService.getDbs();


    ngOnInit() {

        this.selectedProject = this.settingsService.getSelectedProject();
    }


    public reset() {

        this.projectToDelete = '';
        this.newProject = '';
    }


    public openModal() {

        this.modalRef = this.modalService.open(this.modalTemplate);
    }


    public async selectProject() {

        this.settingsService.stopSync();

        await this.settingsService.selectProject(this.selectedProject);
        ProjectsComponent.reload();
    }


    public async createProject() {

        const validationErrorMessage: string[]|undefined = ProjectNameValidator.validate(
            this.newProject, this.getProjects()
        );
        if (validationErrorMessage) return this.messages.add(validationErrorMessage);

        this.settingsService.stopSync();

        await this.settingsService.createProject(
            this.newProject,
            remote.getGlobal('switches')
                && remote.getGlobal('switches').destroy_before_create
        );
        ProjectsComponent.reload();
    }


    public async deleteProject() {

        if (!this.canDeleteProject()) return;

        this.settingsService.stopSync();

        await this.settingsService.deleteProject(this.selectedProject);
        this.selectedProject = this.getProjects()[0];
        ProjectsComponent.reload();
    }


    public async editProject() {

        const document = this.settingsService.getProjectDocument();

        const doceditRef = this.modalService.open(DoceditComponent, { size: 'lg', backdrop: 'static' });
        doceditRef.componentInstance.setDocument(document);

        await doceditRef.result.then(
            () => this.settingsService.loadProjectDocument(),
            closeReason => {}
        );
    }


    private canDeleteProject() {

        if (!this.projectToDelete || (this.projectToDelete === '')) {
            return false;
        }
        if (this.projectToDelete !== this.selectedProject) {
            this.messages.add([M.RESOURCES_WARNING_PROJECT_NAME_NOT_SAME]);
            return false;
        }
        if (this.getProjects().length < 2) {
            this.messages.add([M.RESOURCES_ERROR_ONE_PROJECT_MUST_EXIST]);
            return false;
        }
        return true;
    }


    // We have to reload manually since protractor's selectors apparently aren't reliably working as they
    // should after a reload. So we will do this by hand in the E2Es.
    private static reload() {

        if (!remote.getGlobal('switches') || !remote.getGlobal('switches').prevent_reload) {
            window.location.reload();
        }
    }
}
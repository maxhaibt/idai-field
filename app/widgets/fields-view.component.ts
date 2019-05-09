import {Component, OnChanges, Input, Output, EventEmitter} from '@angular/core';
import {I18n} from '@ngx-translate/i18n-polyfill';
import {isUndefinedOrEmpty} from 'tsfun';
import {Resource, ProjectConfiguration, FieldDefinition, IdaiType} from 'idai-components-2';


type FieldViewGroupDefinition = {
    name: string;
    label: string;
    shown: boolean;
}


@Component({
    selector: 'fields-view',
    moduleId: module.id,
    templateUrl: './fields-view.html'
})
/**
 * @author Thomas Kleinke
 * @author Sebastian Cuy
 */
export class FieldsViewComponent implements OnChanges {

    @Input() resource: Resource;
    @Input() openSection: string|undefined = 'stem';

    @Output() onSectionToggled: EventEmitter<string|undefined> = new EventEmitter<string|undefined>();

    public fields: { [groupName: string]: Array<any> };

    private groups: Array<FieldViewGroupDefinition> = [
        { name: 'stem', label: this.i18n({ id: 'docedit.group.stem', value: 'Stammdaten' }), shown: true },
        { name: 'properties', label: '', shown: false },
        { name: 'child', label: '', shown: false },
        { name: 'dimension', label: this.i18n({ id: 'docedit.group.dimensions', value: 'Maße' }), shown: false },
        { name: 'position', label: this.i18n({ id: 'docedit.group.position', value: 'Lage' }), shown: false },
        { name: 'time', label: this.i18n({ id: 'docedit.group.time', value: 'Zeit' }), shown: false }
    ];


    constructor(private projectConfiguration: ProjectConfiguration,
                private i18n: I18n) {}


    ngOnChanges() {

        this.fields = {};
        if (this.resource) {
            this.processFields(this.resource);
            this.updateGroupLabels(this.resource.type);
        }
    }


    public isBoolean(value: any): boolean {

        return typeof value === 'boolean';
    }


    public getGroups(): Array<FieldViewGroupDefinition> {

        return this.groups.filter(group => {
            return this.fields[group.name] !== undefined && this.fields[group.name].length > 0;
        });
    }


    public toggleGroupSection(group: FieldViewGroupDefinition) {

        this.openSection = this.openSection === group.name
            ? undefined
            : this.openSection = group.name;

        this.onSectionToggled.emit(this.openSection);
    }


    private updateGroupLabels(typeName: string) {

        const type: IdaiType = this.projectConfiguration.getTypesMap()[typeName];
        if (type.parentType) {
            this.groups[1].label = type.parentType.label;
            this.groups[2].label = type.label;
        } else {
            this.groups[1].label = type.label;
        }
    }


    private processFields(resource: Resource) {

        this.addBaseFields(resource);

        const fields: Array<FieldDefinition> = this.projectConfiguration
            .getFieldDefinitions(resource.type);

        for (let field of fields) {
            if (field.name === 'relations') continue;
            if (resource[field.name] === undefined) continue;

            const group: string = field.group ? field.group : 'properties';

            if (!this.fields[group]) this.fields[group] = [];

            if (field.name === 'period') {
                this.fields[group].push({
                    label: this.i18n({
                        id: 'widgets.fieldsView.period',
                        value: 'Grobdatierung'
                    }) + (!isUndefinedOrEmpty(resource['periodEnd'])
                        ? this.i18n({
                            id: 'widgets.fieldsView.period.from',
                            value: ' (von)'
                        }) : ''),
                    value: FieldsViewComponent.getValue(resource, field.name),
                    isArray: false
                });

                if (!isUndefinedOrEmpty(resource['periodEnd'])) {
                    this.fields[group].push({
                        label: this.i18n({
                            id: 'widgets.fieldsView.period.to',
                            value: 'Grobdatierung (bis)'
                        }),
                        value: FieldsViewComponent.getValue(resource, 'periodEnd'),
                        isArray: false
                    });
                }
                continue;
            }

            if (!this.projectConfiguration.isVisible(resource.type, field.name)) continue;

            this.fields[group].push({
                label: this.projectConfiguration.getFieldDefinitionLabel(resource.type, field.name),
                value: FieldsViewComponent.getValue(resource, field.name),
                isArray: Array.isArray(resource[field.name])
            });
        }
    }


    private addBaseFields(resource: Resource) {

        this.fields['stem'] = [
            {
                label: this.getLabel(resource.type, 'shortDescription'),
                value: FieldsViewComponent.getValue(resource, 'shortDescription'),
                isArray: false
            }, {
                label: this.getLabel(resource.type, 'type'),
                value: this.projectConfiguration.getLabelForType(resource.type),
                isArray: false
            }
        ];
    }


    private getLabel(type: string, fieldName: string): string {

        return this.projectConfiguration
            .getTypesMap()[type].fields
            .find((field: FieldDefinition) => field.name == fieldName).label;
    }


    private static getValue(resource: Resource, fieldName: string): any {

        if (typeof resource[fieldName] === 'string') {
            return resource[fieldName]
                .replace(/^\s+|\s+$/g, '')
                .replace(/\n/g, '<br>');
        } else {
            return resource[fieldName];
        }
    }
}

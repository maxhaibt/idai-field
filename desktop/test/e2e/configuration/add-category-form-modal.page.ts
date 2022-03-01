import { click, getElement, typeIn } from '../app';


/**
 * @author Thomas Kleinke
 */
export class AddCategoryFormModalPage {

    // click

    public static clickSelectForm(formName: string) {

        return click(this.getSelectFormButton(formName));
    }


    public static clickAddCategory() {

        return click('#add-category-button');
    }


    public static clickCancel() {

        return click('#cancel-add-category-modal-button');
    }


    // get

    public static getCategoryHeader(categoryName: string) {

        return getElement('#category-header-' + categoryName);
    }


    public static getSelectFormButton(formName: string) {

        return getElement('#select-category-form-' + formName.replace(':', '-'));
    }


    // type in

    public static typeInSearchFilterInput(text: string) {

        return typeIn('#category-name', text);
    }
}

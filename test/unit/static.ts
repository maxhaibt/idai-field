import {Document, FieldDocument, FeatureDocument} from 'idai-components-2';


/**
 * @author Daniel de Oliveira
 * @author Sebastian Cuy
 */
export class Static {

    public static fieldDoc = (sd, identifier?, type?, id?) => Static.doc(sd, identifier, type, id) as FieldDocument;


    public static featureDoc = (sd, identifier?, type?, id?) => {

        const doc = Static.doc(sd, identifier, type, id) as FeatureDocument;
        doc.resource.relations.isContemporaryWith = [];
        doc.resource.relations.isBefore = [];
        doc.resource.relations.isAfter = [];
        return doc;
    };


    public static doc(sd, identifier?, type?, id?): Document {

        if (!identifier) identifier = 'identifer';
        if (!type) type = 'Find';
        const doc: Document = {
            _id: 'A',
            resource : {
                id: 'A',
                shortDescription: sd,
                identifier: identifier,
                title: 'title',
                type: type,
                relations : {}
            },
            created: {
                user: 'anonymous',
                date: new Date()
            },
            modified: [
                {
                    user: 'anonymous',
                    date: new Date()
                }
            ]
        };
        if (id) {
            doc._id = id;
            doc.resource.id = id;
        } else delete doc.resource.id;
        return doc as Document;
    }
}
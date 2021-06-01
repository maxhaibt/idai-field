/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Document, ProjectConfiguration } from 'idai-field-core';
import React, { ReactElement, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Circle } from 'react-native-svg';
import useMapData from '../../../hooks/use-mapdata';
import { DocumentRepository } from '../../../repositories/document-repository';
import {
    GeoLineString, GeoMultiLineString, GeoMultiPoint,
    GeoMultiPolygon, GeoPoint, GeoPolygon
} from './geo-svg';
import { ViewPort } from './geo-svg/geojson-cs-to-svg-cs/viewport-utils/viewport-utils';
import { GeoMap } from './geometry-map/geometry-map';
import MapBottomDrawer from './MapBottomDrawer';
import { getDocumentFillOpacityPress } from './svg-element-props';
import SvgMap from './SvgMap/SvgMap';

interface MapProps {
    repository: DocumentRepository
    selectedDocumentIds: string[];
    config: ProjectConfiguration;
    navigateToDocument: (docId: string) => void;
}


const Map: React.FC<MapProps> = ({ repository, selectedDocumentIds, config, navigateToDocument }) => {

    const [viewPort, setViewPort] = useState<ViewPort>();
    const [highlightedDoc, setHighlightedDoc] = useState<Document | null>(null);


    const selectDocHandler = (doc: Document) => {

        setHighlightedDoc(doc);
    };


    const handleLayoutChange = (event: LayoutChangeEvent) => {

        setViewPort(event.nativeEvent.layout);
    };
    

    const [
        docIds,
        documentsGeoMap,
        transformMatrix, viewBox] = useMapData(repository,viewPort, selectedDocumentIds);


    return (
        <View style={ { flex: 1 } }>
            <View onLayout={ handleLayoutChange } style={ styles.mapContainer }>
                { (docIds && documentsGeoMap && viewPort && transformMatrix && viewBox) &&
                    <SvgMap style={ styles.svg } viewPort={ viewPort }
                        viewBox={ viewBox.join(' ') }>
                        {docIds.map(docId =>
                            renderGeoSvgElement(
                                documentsGeoMap,
                                config,
                                selectDocHandler,
                                highlightedDoc ? highlightedDoc.resource.id : '',
                                docId))}
                    </SvgMap>
                }
            </View>
            <MapBottomDrawer
                document={ highlightedDoc }
                config={ config }
                navigateToDocument={ navigateToDocument } />
        </View>
    );
};

const styles = StyleSheet.create({
    mapContainer: {
        flex: 1,
    },
    svg: {
        height: '100%',
        width: '100%'
    },
});


const renderGeoSvgElement = (
        geoMap: GeoMap,
        config: ProjectConfiguration,
        onPressHandler: (doc: Document) => void,
        highlightedDocId: string,
        docId: string): ReactElement => {
    

    const doc = geoMap.get(docId)!.doc;
    const geoType = doc.resource.geometry.type;

    const props = {
        coordinates: geoMap.get(docId)!.transformedCoords,
        key: docId,
        ...getDocumentFillOpacityPress(
            doc,
            geoMap,
            onPressHandler,
            config,
            highlightedDocId === docId,
            geoMap.get(docId)!.isSelected),
    };
 

    switch(geoType){
        case('Polygon'):
            return <GeoPolygon { ...props } />;
        case('MultiPolygon'):
            return <GeoMultiPolygon { ...props } />;
        case('LineString'):
            return <GeoLineString { ...props } />;
        case('MultiLineString'):
            return <GeoMultiLineString { ...props } />;
        case('Point'):
            return <GeoPoint { ...props } />;
        case('MultiPoint'):
            return <GeoMultiPoint { ...props } />;
        default:
            console.error(`Unknown type: ${geoType}`);
            return <Circle />;

    }
};


export default Map;

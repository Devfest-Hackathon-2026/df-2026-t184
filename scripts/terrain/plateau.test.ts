import { describe, expect, test } from "vitest";
import { parseBldgGml, pointInPolygon } from "./plateau";

const GML = `<?xml version="1.0"?>
<core:CityModel xmlns:bldg="b" xmlns:gml="g" xmlns:core="c">
<core:cityObjectMember>
<bldg:Building gml:id="b1">
  <bldg:measuredHeight uom="m">12.5</bldg:measuredHeight>
  <bldg:lod1Solid>
    <gml:Solid><gml:exterior><gml:CompositeSurface>
      <gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.700 139.700 5.0 35.701 139.700 5.0 35.701 139.701 5.0 35.700 139.701 5.0 35.700 139.700 5.0</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember>
      <gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.700 139.700 17.5 35.701 139.700 17.5 35.701 139.701 17.5 35.700 139.701 17.5 35.700 139.700 17.5</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember>
      <gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.700 139.700 5.0 35.701 139.700 5.0 35.701 139.700 17.5 35.700 139.700 17.5 35.700 139.700 5.0</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember>
    </gml:CompositeSurface></gml:exterior></gml:Solid>
  </bldg:lod1Solid>
</bldg:Building>
</core:cityObjectMember>
<core:cityObjectMember>
<bldg:Building gml:id="b2">
  <bldg:measuredHeight uom="m">-9999</bldg:measuredHeight>
  <bldg:lod1Solid>
    <gml:Solid><gml:exterior><gml:CompositeSurface>
      <gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.710 139.710 8.0 35.711 139.710 8.0 35.711 139.711 8.0 35.710 139.711 8.0 35.710 139.710 8.0</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember>
      <gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>35.710 139.710 15.0 35.711 139.710 15.0 35.711 139.711 15.0 35.710 139.711 15.0 35.710 139.710 15.0</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember>
    </gml:CompositeSurface></gml:exterior></gml:Solid>
  </bldg:lod1Solid>
</bldg:Building>
</core:cityObjectMember>
<core:cityObjectMember>
<bldg:Building gml:id="b3-no-solid">
  <bldg:lod2MultiSurface><gml:MultiSurface/></bldg:lod2MultiSurface>
</bldg:Building>
</core:cityObjectMember>
</core:CityModel>`;

describe("parseBldgGml", () => {
  const buildings = parseBldgGml(GML);

  test("lod1Solid のある棟だけ取れる", () => {
    expect(buildings.length).toBe(2);
  });

  test("脚注は最下面・棟頂は最大z・高さは measuredHeight", () => {
    const b = buildings[0];
    expect(b.topM).toBeCloseTo(17.5);
    expect(b.heightM).toBeCloseTo(12.5);
    expect(Math.min(...b.footprint.map((p) => p.lat))).toBeCloseTo(35.7);
    expect(Math.max(...b.footprint.map((p) => p.lng))).toBeCloseTo(139.701);
  });

  test("measuredHeight が -9999 は null（欠損）", () => {
    expect(buildings[1].heightM).toBeNull();
    expect(buildings[1].topM).toBeCloseTo(15);
  });
});

describe("pointInPolygon", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  test("内外判定", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
    expect(pointInPolygon({ x: -1, y: 5 }, square)).toBe(false);
  });
});

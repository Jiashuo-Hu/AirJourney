import importlib.util, pathlib, unittest
spec=importlib.util.spec_from_file_location('prepare',pathlib.Path(__file__).resolve().parents[1]/'scripts/prepare-airports.py')
prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
class LocationTests(unittest.TestCase):
    def setUp(self):
        self.row={'latitude_deg':'','longitude_deg':'','iso_country':'FR','municipality':'Paris'}
        self.city={'id':'2988507','lat':48.85341,'lon':2.3488}
        self.cities={('FR','paris'):{'2988507':self.city}}
    def test_airport_coordinates_win(self):
        r=prepare.resolve_location({**self.row,'latitude_deg':'49.0097','longitude_deg':'2.5479'},self.cities)
        self.assertEqual(r['locationKind'],'airport');self.assertEqual(r['lat'],49.0097)
    def test_unique_city_fallback_is_explicit(self):
        r=prepare.resolve_location(self.row,self.cities)
        self.assertEqual(r['locationKind'],'approximate');self.assertIn('2988507',r['locationSource']);self.assertEqual(r['lat'],self.city['lat'])
    def test_ambiguous_city_unlocated(self):
        self.cities[('FR','paris')]['other']={**self.city,'id':'other','lat':44}
        r=prepare.resolve_location(self.row,self.cities)
        self.assertEqual(r['locationKind'],'unlocated');self.assertNotIn('lat',r)
    def test_no_cross_country_or_fuzzy_match(self):
        for row in [{**self.row,'iso_country':'US'},{**self.row,'municipality':'Pariss'}]:
            self.assertEqual(prepare.resolve_location(row,self.cities)['locationKind'],'unlocated')
    def test_invalid_pair_uses_city_not_partial_airport(self):
        r=prepare.resolve_location({**self.row,'latitude_deg':'999','longitude_deg':'2.54'},self.cities)
        self.assertEqual(r['locationKind'],'approximate');self.assertEqual(r['lon'],self.city['lon'])
if __name__=='__main__':unittest.main()

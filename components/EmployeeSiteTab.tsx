import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Employee } from "@/api-client";
import { useUpdateEmployeeSite, type EmployeeSite } from "@/api-client";
import { useColors } from "@/hooks/useColors";
import { useModal } from "@/components/CustomModal";
import { Field, PrimaryButton } from "@/components/ui";
import { fonts } from "@/constants/fonts";

const DEFAULT_COORDINATE: [number, number] = [77.209, 28.6139];

export function EmployeeSiteTab({
  employee,
  onSaved,
}: {
  employee: Employee;
  onSaved: () => void;
}) {
  const colors = useColors();
  const { showModal } = useModal();
  const update = useUpdateEmployeeSite();
  const [siteName, setSiteName] = useState(employee.siteName ?? employee.site);
  const [siteAddress, setSiteAddress] = useState(employee.siteAddress ?? "");
  const [coordinate, setCoordinate] = useState<[number, number]>(() =>
    employee.siteLatitude != null && employee.siteLongitude != null
      ? [employee.siteLongitude, employee.siteLatitude]
      : DEFAULT_COORDINATE,
  );
  const [searching, setSearching] = useState(false);

  const searchAddress = async () => {
    if (Platform.OS === "web") {
      showModal({
        type: "info",
        title: "Android app required",
        message: "Mappls address search is available in the Android build.",
      });
      return;
    }
    setSearching(true);
    try {
      // The Mappls SDK reads the bundled .conf/.olf credentials natively.
      const MapplsUIWidgets = require("mappls-search-widgets-react-native").default;
      const result = await MapplsUIWidgets.searchWidget({
        location: coordinate,
        hint: "Search site address",
        toolbarColor: colors.card,
        toolbarTintColor: colors.foreground,
        resultBackgroundColor: colors.card,
        placeNameTextColor: colors.foreground,
        addressTextColor: colors.secondaryForeground,
      });
      const location = result?.eLocation;
      if (!location) return;
      const nextCoordinate: [number, number] = [
        Number(location.longitude),
        Number(location.latitude),
      ];
      if (nextCoordinate.every(Number.isFinite)) {
        setCoordinate(nextCoordinate);
        setSiteAddress(location.placeAddress || location.placeName || "");
      }
    } catch (error) {
      showModal({
        type: "error",
        title: "Address search unavailable",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSearching(false);
    }
  };

  const save = () => {
    const data: EmployeeSite = {
      siteName: siteName.trim(),
      siteLatitude: coordinate[1],
      siteLongitude: coordinate[0],
      siteAddress: siteAddress.trim() || null,
    };
    if (!data.siteName) {
      showModal({ type: "error", title: "Site name required", message: "Enter a custom site name before saving." });
      return;
    }
    update.mutate(
      { employeeId: String(employee.employeeId), data },
      {
        onSuccess: () => {
          onSaved();
          showModal({ type: "success", title: "Site saved", message: "The employee site was updated." });
        },
        onError: (error) =>
          showModal({
            type: "error",
            title: "Could not save site",
            message: error instanceof Error ? error.message : "Please try again.",
          }),
      },
    );
  };

  return (
    <View style={styles.wrap}>
      <Field
        label="Custom site name"
        value={siteName}
        onChangeText={setSiteName}
        placeholder="e.g. Main Gate"
        disabled={update.isPending}
      />
      <Pressable
        onPress={() => void searchAddress()}
        disabled={searching || update.isPending}
        style={({ pressed }) => [
          styles.searchButton,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 },
        ]}
      >
        {searching ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Feather name="search" size={17} color={colors.primary} />
        )}
        <Text style={[styles.searchText, { color: colors.foreground }]}>
          {searching ? "Searching Mappls…" : "Search address with Mappls"}
        </Text>
      </Pressable>
      <TextInput
        value={siteAddress}
        onChangeText={setSiteAddress}
        placeholder="Selected address"
        placeholderTextColor={colors.mutedForeground}
        multiline
        style={[
          styles.addressInput,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
        ]}
      />
      <View style={[styles.mapCard, { borderColor: colors.border }]}>
        <NativeMap
          coordinate={coordinate}
          onCoordinateChange={setCoordinate}
        />
      </View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Select an address to set the initial position, then move the map under the pin to choose the final location.
      </Text>
      <Text style={[styles.coordinates, { color: colors.secondaryForeground }]}>
        Pin: {coordinate[1].toFixed(6)}, {coordinate[0].toFixed(6)}
      </Text>
      <PrimaryButton
        label={update.isPending ? "Saving site…" : "Save Site"}
        icon="check"
        onPress={save}
        disabled={update.isPending}
        loading={update.isPending}
      />
    </View>
  );
}

function NativeMap({
  coordinate,
  onCoordinateChange,
}: {
  coordinate: [number, number];
  onCoordinateChange: (coordinate: [number, number]) => void;
}) {
  const colors = useColors();
  if (Platform.OS === "web") {
    return (
      <View style={[styles.mapFallback, { backgroundColor: colors.secondary }]}>
        <Feather name="map-pin" size={30} color={colors.primary} />
        <Text style={[styles.mapFallbackText, { color: colors.foreground }]}>
          Map available in the Android build
        </Text>
      </View>
    );
  }
  const MapplsGL = require("mappls-map-react-native");
  const { MapView, Camera } = MapplsGL;
  return (
    <View style={styles.map}>
      <MapView
        style={StyleSheet.absoluteFill}
        logoClickEnabled={false}
        attributionEnabled
        onRegionDidChange={(feature: { geometry?: { coordinates?: number[] } }) => {
          const next = feature.geometry?.coordinates;
          if (next && Number.isFinite(next[0]) && Number.isFinite(next[1])) {
            onCoordinateChange([next[0], next[1]]);
          }
        }}
      >
        <Camera centerCoordinate={coordinate} zoomLevel={15} />
      </MapView>
      <View pointerEvents="none" style={styles.pin}>
        <Feather name="map-pin" size={34} color={colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 30, gap: 12 },
  searchButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchText: { ...fonts.semibold, fontSize: 13 },
  addressInput: {
    minHeight: 66,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
    ...fonts.regular,
    fontSize: 13,
  },
  mapCard: { height: 285, borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  map: { flex: 1 },
  pin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -17,
    marginTop: -34,
  },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  mapFallbackText: { ...fonts.medium, fontSize: 12 },
  hint: { ...fonts.regular, fontSize: 11, lineHeight: 17 },
  coordinates: { ...fonts.medium, fontSize: 11 },
});
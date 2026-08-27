import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { reportGuardGeofenceEvent } from "@/api-client";
import { useEffect, useState } from "react";

const TASK_NAME = "target-security-guard-geofence";

if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
    if (error || !data || typeof data !== "object") return;
    const eventType = (data as { eventType?: Location.GeofencingEventType }).eventType;
    if (eventType !== Location.GeofencingEventType.Enter && eventType !== Location.GeofencingEventType.Exit) return;
    try {
      await reportGuardGeofenceEvent(eventType === Location.GeofencingEventType.Exit ? "EXIT" : "ENTER");
    } catch {
      // Boundary events are best-effort when connectivity is unavailable.
    }
  });
}

export function useGuardGeofence(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) {
  const [status, setStatus] = useState("Site geofence is not configured.");
  useEffect(() => {
    if (Platform.OS !== "android") {
      setStatus("Geofencing is available in the Android build.");
      return;
    }
    if (latitude == null || longitude == null) {
      setStatus("Ask an admin to assign site coordinates.");
      return;
    }
    let cancelled = false;
    const start = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (!cancelled) setStatus("Location services are disabled.");
          return;
        }
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (foreground.status !== "granted") {
          if (!cancelled) setStatus("Location permission is needed for the site boundary.");
          return;
        }
        const background = await Location.requestBackgroundPermissionsAsync();
        if (background.status !== "granted") {
          if (!cancelled) setStatus("Allow background location to monitor the 100m boundary.");
          return;
        }
        await Location.startGeofencingAsync(TASK_NAME, [{
          identifier: "assigned-site",
          latitude,
          longitude,
          radius: 100,
          notifyOnEnter: true,
          notifyOnExit: true,
        }]);
        if (!cancelled) setStatus("100m site boundary is active.");
      } catch {
        if (!cancelled) setStatus("Unable to start location monitoring.");
      }
    };
    void start();
    return () => {
      cancelled = true;
      void Location.hasStartedGeofencingAsync(TASK_NAME)
        .then((started) => (started ? Location.stopGeofencingAsync(TASK_NAME) : undefined))
        .catch(() => undefined);
    };
  }, [latitude, longitude]);
  return status;
}
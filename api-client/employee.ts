import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { Employee } from "./generated/api.schemas";

export type EmployeeAadhaar = {
  imageUrl: string;
};

export function useGetEmployeeAadhaar(employeeId: string) {
  return useQuery({
    queryKey: ["employee", employeeId, "aadhaar"],
    queryFn: () =>
      customFetch<EmployeeAadhaar | null>(
        `/api/employees/${employeeId}/documents/aadhaar`,
        { responseType: "json" },
      ),
    enabled: Boolean(employeeId),
  });
}

export type EmployeeSite = {
  siteName: string;
  siteLatitude: number;
  siteLongitude: number;
  siteAddress: string | null;
};

export function updateEmployeeSite(
  employeeId: string,
  data: EmployeeSite,
) {
  return customFetch<Employee>(`/api/employees/${employeeId}/site`, {
    method: "PATCH",
    body: JSON.stringify(data),
    responseType: "json",
  });
}

export function useUpdateEmployeeSite() {
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: EmployeeSite }) =>
      updateEmployeeSite(employeeId, data),
  });
}
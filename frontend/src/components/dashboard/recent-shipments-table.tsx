"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Truck, Eye, MapPin, MoreVertical } from "lucide-react";
import type { RecentShipmentsResponse } from "@/utils/lib/server-api";

interface RecentShipmentsTableProps {
  shipments: RecentShipmentsResponse;
}

export function RecentShipmentsTable({ shipments }: RecentShipmentsTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Shipments in Transit</CardTitle>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Identifier",
                  "Origin",
                  "Destination", 
                  "Dangerous Goods",
                  "Hazchem Code",
                  "Progress",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shipments.shipments.length ? (
                shipments.shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Truck className="w-5 h-5 text-gray-600" />
                        </div>
                        <span className="font-semibold text-gray-900">
                          {shipment.identifier}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {shipment.origin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {shipment.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex -space-x-2">
                        {shipment.dangerous_goods
                          ?.slice(0, 3)
                          .map((dg, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="w-8 h-8 rounded-full p-0 text-xs border-2 border-white"
                              title={dg}
                            >
                              DG
                            </Badge>
                          ))}
                        {(shipment.dangerous_goods?.length || 0) > 3 && (
                          <Badge
                            variant="outline"
                            className="w-8 h-8 rounded-full p-0 text-xs border-2 border-white"
                          >
                            +{(shipment.dangerous_goods?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {shipment.hazchem_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Progress value={shipment.progress} className="flex-1" />
                        <span className="text-sm text-gray-600 w-12">
                          {shipment.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MapPin className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No recent shipments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-700">
            Showing 1 to {shipments.shipments.length} of {shipments.total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Previous
            </Button>
            <Button size="sm">1</Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
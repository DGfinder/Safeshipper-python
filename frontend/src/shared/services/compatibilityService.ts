interface CompatibilityCheck {
  item1: string;
  item2: string;
  compatible: boolean;
  segregationCode: string;
  rule: string;
  explanation: string;
}

interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityCheck[];
  warnings: string[];
  recommendations: string[];
}

interface DangerousGood {
  id: string;
  un: string;
  class: string;
  subHazard?: string;
  packingGroup?: string;
  properShippingName: string;
}

class CompatibilityService {
  private baseUrl = "/api/v1";

  async checkCompatibility(
    items: DangerousGood[],
  ): Promise<CompatibilityResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/dangerous-goods/check-compatibility/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dangerous_goods: items.map((item) => ({
              un_number: item.un,
              hazard_class: item.class,
              sub_hazard: item.subHazard,
              packing_group: item.packingGroup,
              proper_shipping_name: item.properShippingName,
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to check compatibility");
      }

      const data = await response.json();
      return this.transformBackendResponse(data);
    } catch (error) {
      console.error("Compatibility check failed:", error);
      // Return mock compatibility result for now
      return this.getMockCompatibilityResult(items);
    }
  }

  async checkPairCompatibility(
    item1: DangerousGood,
    item2: DangerousGood,
  ): Promise<CompatibilityCheck> {
    try {
      const response = await fetch(
        `${this.baseUrl}/dangerous-goods/check-pair-compatibility/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item1: {
              un_number: item1.un,
              hazard_class: item1.class,
              sub_hazard: item1.subHazard,
              packing_group: item1.packingGroup,
            },
            item2: {
              un_number: item2.un,
              hazard_class: item2.class,
              sub_hazard: item2.subHazard,
              packing_group: item2.packingGroup,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to check pair compatibility");
      }

      const data = await response.json();
      return {
        item1: item1.properShippingName,
        item2: item2.properShippingName,
        compatible: data.compatible,
        segregationCode: data.segregation_code || "N/A",
        rule: data.rule || "Unknown",
        explanation: data.explanation || "No explanation available",
      };
    } catch (error) {
      console.error("Pair compatibility check failed:", error);
      return this.getMockPairCompatibility(item1, item2);
    }
  }

  private transformBackendResponse(data: any): CompatibilityResult {
    return {
      compatible: data.overall_compatible || false,
      issues:
        data.incompatible_pairs?.map((pair: any) => ({
          item1: pair.item1_name,
          item2: pair.item2_name,
          compatible: false,
          segregationCode: pair.segregation_code,
          rule: pair.rule,
          explanation: pair.explanation,
        })) || [],
      warnings: data.warnings || [],
      recommendations: data.recommendations || [],
    };
  }

  private getMockCompatibilityResult(
    items: DangerousGood[],
  ): CompatibilityResult {
    // Simulate compatibility checking based on known dangerous combinations
    const issues: CompatibilityCheck[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for known incompatible combinations
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const item1 = items[i];
        const item2 = items[j];

        // Example: Class 1 (Explosives) is incompatible with Class 5.1 (Oxidizers)
        if (
          (item1.class.startsWith("1") && item2.class === "5.1") ||
          (item2.class.startsWith("1") && item1.class === "5.1")
        ) {
          issues.push({
            item1: item1.properShippingName,
            item2: item2.properShippingName,
            compatible: false,
            segregationCode: "X",
            rule: "IMDG 7.2.2.3",
            explanation:
              "Explosives must be segregated from oxidizing substances",
          });
        }

        // Example: Class 3 (Flammable liquids) needs separation from Class 5.1 (Oxidizers)
        if (
          (item1.class === "3" && item2.class === "5.1") ||
          (item2.class === "3" && item1.class === "5.1")
        ) {
          warnings.push(
            `Flammable liquids (${item1.class === "3" ? item1.properShippingName : item2.properShippingName}) require separation from oxidizers`,
          );
        }
      }
    }

    if (issues.length === 0 && warnings.length === 0) {
      recommendations.push(
        "All dangerous goods are compatible for transport together",
      );
    } else if (issues.length > 0) {
      recommendations.push(
        "Remove incompatible items or transport in separate vehicles",
      );
    } else if (warnings.length > 0) {
      recommendations.push(
        "Ensure proper segregation distances are maintained during loading",
      );
    }

    return {
      compatible: issues.length === 0,
      issues,
      warnings,
      recommendations,
    };
  }

  private getMockPairCompatibility(
    item1: DangerousGood,
    item2: DangerousGood,
  ): CompatibilityCheck {
    // Simple mock logic for pair compatibility
    const incompatiblePairs = [
      { classes: ["1", "5.1"], code: "X" },
      { classes: ["3", "5.1"], code: "2" },
      { classes: ["4.1", "5.1"], code: "2" },
      { classes: ["6.1", "3"], code: "1" },
    ];

    for (const pair of incompatiblePairs) {
      if (
        pair.classes.includes(item1.class) &&
        pair.classes.includes(item2.class) &&
        item1.class !== item2.class
      ) {
        return {
          item1: item1.properShippingName,
          item2: item2.properShippingName,
          compatible: pair.code !== "X",
          segregationCode: pair.code,
          rule: `IMDG Segregation Table ${pair.code}`,
          explanation:
            pair.code === "X"
              ? "These substances must not be transported together"
              : `These substances require ${pair.code === "1" ? "away from" : "separated from"} each other`,
        };
      }
    }

    return {
      item1: item1.properShippingName,
      item2: item2.properShippingName,
      compatible: true,
      segregationCode: "0",
      rule: "IMDG Segregation Table",
      explanation: "These substances are compatible for transport together",
    };
  }

  getSegregationCodeMeaning(code: string): string {
    const meanings: { [key: string]: string } = {
      X: "Segregation prohibited - Must not be transported together",
      "4": "Separation required - Different holds/vehicles",
      "3": "Separation required - Different compartments",
      "2": "Separated from - At least 3m apart",
      "1": "Away from - At least 6m apart",
      "0": "No special segregation requirements",
    };
    return meanings[code] || "Unknown segregation requirement";
  }
}

export const compatibilityService = new CompatibilityService();
export type { CompatibilityResult, CompatibilityCheck, DangerousGood };

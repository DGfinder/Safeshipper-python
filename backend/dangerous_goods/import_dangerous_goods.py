import csv
from pathlib import Path
from dangerous_goods.models import DangerousGood, DGProductSynonym

def run():
    csv_path = Path("compatible_dg_data.csv")  # Place in project root or adjust path

    with csv_path.open(newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if not row["un_number"] or not row["proper_shipping_name"]:
                continue  # Skip incomplete

            dg, created = DangerousGood.objects.update_or_create(
                un_number=row["un_number"],
                defaults={
                    "proper_shipping_name": row["proper_shipping_name"],
                    "simplified_name": row.get("simplified_name") or None,
                    "hazard_class": row.get("hazard_class") or None,
                    "subsidiary_risks": row.get("subsidiary_risks") or None,
                    "packing_group": row.get("packing_group") or None,
                    "hazard_labels_required": row.get("hazard_labels_required") or None,
                    "erg_guide_number": row.get("erg_guide_number") or None,
                    "special_provisions": row.get("special_provisions") or None,
                    "qty_ltd_passenger_aircraft": row.get("qty_ltd_passenger_aircraft") or None,
                    "packing_instruction_passenger_aircraft": row.get("packing_instruction_passenger_aircraft") or None,
                    "qty_ltd_cargo_aircraft": row.get("qty_ltd_cargo_aircraft") or None,
                    "packing_instruction_cargo_aircraft": row.get("packing_instruction_cargo_aircraft") or None,
                    "description_notes": row.get("description_notes") or None,
                    "is_marine_pollutant": row.get("is_marine_pollutant", "").lower() == "true",
                    "is_environmentally_hazardous": row.get("is_environmentally_hazardous", "").lower() == "true",
                }
            )

            # Create synonyms from simplified_name (split on commas) and PSN as fallback
            existing_synonyms = set(dg.synonyms.values_list("synonym", flat=True))
            simplified_terms = []

            if row.get("simplified_name"):
                simplified_terms += [s.strip() for s in row["simplified_name"].split(",")]

            # Add proper_shipping_name as a fallback synonym
            simplified_terms.append(row["proper_shipping_name"].strip())

            for term in simplified_terms:
                if term and term not in existing_synonyms:
                    DGProductSynonym.objects.create(
                        dangerous_good=dg,
                        synonym=term,
                        source=DGProductSynonym.Source.IATA_IMPORT
                    )

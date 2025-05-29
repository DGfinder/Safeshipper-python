# dangerous_goods/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _

class PackingGroup(models.TextChoices):
    I = 'I', _('I (High Danger)')
    II = 'II', _('II (Medium Danger)')
    III = 'III', _('III (Low Danger)')
    # NONE = 'NONE', _('None') # If some DGs don't have a packing group

class DangerousGood(models.Model):
    """
    Represents a specific dangerous good entry, typically based on IATA/IMDG regulations.
    """
    un_number = models.CharField(
        _("UN Number"),
        max_length=10,
        unique=True,
        db_index=True,
        help_text=_("Unique UN number for the hazardous substance (e.g., UN1230).")
    )
    proper_shipping_name = models.CharField(
        _("Proper Shipping Name (PSN)"),
        max_length=500, # PSNs can be quite long
        db_index=True,
        help_text=_("Official name for the hazardous material for transportation.")
    )
    simplified_name = models.CharField(
        _("Simplified/Common Name"),
        max_length=500,
        blank=True,
        null=True,
        help_text=_("A more concise or common name for the material.")
    )
    hazard_class = models.CharField(
        _("Hazard Class/Division"),
        max_length=10, # e.g., "3", "4.1", "6.2/I"
        db_index=True,
        help_text=_("Hazard class or division (e.g., 3 for flammable liquids).")
    )
    subsidiary_risks = models.CharField(
        _("Subsidiary Risks"),
        max_length=100,
        blank=True,
        null=True,
        help_text=_("Comma-separated subsidiary hazard classes/divisions, if any.")
    )
    packing_group = models.CharField(
        _("Packing Group"),
        max_length=5,
        choices=PackingGroup.choices,
        blank=True,
        null=True, # Not all DGs have a packing group
        help_text=_("Packing group indicating the degree of danger.")
    )
    hazard_labels_required = models.CharField(
        _("Hazard Label(s) Required"),
        max_length=200,
        blank=True,
        null=True,
        help_text=_("Required hazard labels (e.g., 'Flammable Liquid', 'Toxic'). Comma-separated if multiple.")
    )
    erg_guide_number = models.CharField(
        _("ERG Guide Number"),
        max_length=10, # Typically 3 digits, but CharField for flexibility
        blank=True,
        null=True,
        help_text=_("Emergency Response Guidebook number (e.g., 128).")
    )
    special_provisions = models.TextField(
        _("Special Provisions"),
        blank=True,
        null=True,
        help_text=_("Applicable special provisions (e.g., A1, A20, codes from regulations). Can be comma-separated or detailed text.")
    )
    # Quantity Limitations (example structure, can be more detailed)
    qty_ltd_passenger_aircraft = models.CharField(
        _("Qty Ltd - Passenger Aircraft"),
        max_length=50,
        blank=True,
        null=True,
        help_text=_("Quantity limitation for passenger aircraft (e.g., '1 L', 'Forbidden').")
    )
    packing_instruction_passenger_aircraft = models.CharField(
        _("Packing Instruction - Passenger Aircraft"),
        max_length=50, blank=True, null=True
    )
    qty_ltd_cargo_aircraft = models.CharField(
        _("Qty Ltd - Cargo Aircraft Only"),
        max_length=50,
        blank=True,
        null=True,
        help_text=_("Quantity limitation for cargo aircraft (e.g., '30 L', 'Forbidden').")
    )
    packing_instruction_cargo_aircraft = models.CharField(
        _("Packing Instruction - Cargo Aircraft"),
        max_length=50, blank=True, null=True
    )
    # Additional fields for a comprehensive model
    description_notes = models.TextField(
        _("Description/Notes"),
        blank=True,
        null=True,
        help_text=_("Additional descriptive notes or remarks from regulations.")
    )
    is_marine_pollutant = models.BooleanField(
        _("Marine Pollutant"),
        default=False,
        help_text=_("Is the substance a marine pollutant (relevant for IMDG)?")
    )
    is_environmentally_hazardous = models.BooleanField(
        _("Environmentally Hazardous"),
        default=False
    )
    # Could add fields for different transport modes (ADR, RID, 49CFR specifics) if needed

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Dangerous Good / Hazardous Material")
        verbose_name_plural = _("Dangerous Goods / Hazardous Materials")
        ordering = ['un_number']
        indexes = [
            models.Index(fields=['un_number']),
            models.Index(fields=['proper_shipping_name']),
            models.Index(fields=['hazard_class']),
        ]

    def __str__(self):
        return f"{self.un_number} - {self.proper_shipping_name} (Class: {self.hazard_class})"


class DGProductSynonym(models.Model):
    """
    Stores keywords, common product names, or trade names associated with a DangerousGood.
    Used for improving manifest scanning and DG identification.
    """
    dangerous_good = models.ForeignKey(
        DangerousGood,
        related_name='synonyms',
        on_delete=models.CASCADE,
        help_text=_("The official Dangerous Good entry this synonym refers to.")
    )
    synonym = models.CharField(
        _("Keyword/Product Name/Synonym"),
        max_length=255,
        db_index=True,
        help_text=_("A common name, trade name, or keyword for the DG.")
    )

    class Source(models.TextChoices):
        MANUAL = 'MANUAL', _('Manually Entered')
        IATA_IMPORT = 'IATA_IMPORT', _('IATA Data Import') # Example source
        LEARNED_SYSTEM = 'LEARNED_SYSTEM', _('Learned by System')
        USER_CONFIRMED = 'USER_CONFIRMED', _('User Confirmed')
        # Add other sources as needed

    source = models.CharField(
        _("Source of Synonym"),
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
        help_text=_("How this synonym was added to the system.")
    )
    # confidence_score = models.FloatField(null=True, blank=True, help_text="Confidence score if learned by ML.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("DG Product Synonym/Keyword")
        verbose_name_plural = _("DG Product Synonyms/Keywords")
        unique_together = [['dangerous_good', 'synonym']] # Ensure a synonym is unique per DG
        ordering = ['dangerous_good', 'synonym']
        indexes = [
            models.Index(fields=['synonym']),
        ]

    def __str__(self):
        return f"{self.synonym} (for {self.dangerous_good.un_number})"


class SegregationGroup(models.Model):
    """
    Defines segregation groups that DGs can belong to (e.g., "Acids", "Alkalies", "Oxidizers").
    Used for compatibility checks.
    """
    code = models.CharField(_("Group Code"), max_length=20, unique=True, help_text="A code for the segregation group (e.g., 'SGG1a').")
    name = models.CharField(_("Group Name"), max_length=255, help_text="Descriptive name of the segregation group.")
    description = models.TextField(_("Description"), blank=True, null=True)

    dangerous_goods = models.ManyToManyField(
        DangerousGood,
        related_name='segregation_groups',
        blank=True,
        help_text=_("Dangerous goods belonging to this segregation group.")
    )

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        verbose_name = _("DG Segregation Group")
        verbose_name_plural = _("DG Segregation Groups")
        ordering = ['name']


class SegregationRule(models.Model):
    """
    Defines segregation/compatibility rules between DG classes, UN numbers, or segregation groups.
    This is a simplified model; real-world segregation is very complex (e.g., IMDG segregation tables).
    """
    class RuleType(models.TextChoices):
        CLASS_TO_CLASS = 'CLASS_CLASS', _('Class vs Class')
        GROUP_TO_GROUP = 'GROUP_GROUP', _('Segregation Group vs Segregation Group')
        UN_TO_UN = 'UN_UN', _('UN Number vs UN Number')
        # Add more types as needed, e.g., UN_TO_CLASS, UN_TO_GROUP

    rule_type = models.CharField(max_length=20, choices=RuleType.choices, default=RuleType.CLASS_TO_CLASS)

    # For CLASS_TO_CLASS
    primary_hazard_class = models.CharField(_("Primary Hazard Class"), max_length=10, blank=True, null=True, db_index=True)
    secondary_hazard_class = models.CharField(_("Secondary Hazard Class"), max_length=10, blank=True, null=True, db_index=True)

    # For GROUP_TO_GROUP
    primary_segregation_group = models.ForeignKey(SegregationGroup, related_name='primary_rules', on_delete=models.CASCADE, null=True, blank=True)
    secondary_segregation_group = models.ForeignKey(SegregationGroup, related_name='secondary_rules', on_delete=models.CASCADE, null=True, blank=True)

    # For UN_TO_UN (less common to define exhaustively, but possible for specific known pairs)
    # primary_un_number = models.ForeignKey(DangerousGood, related_name='primary_dg_rules', on_delete=models.CASCADE, null=True, blank=True, to_field='un_number')
    # secondary_un_number = models.ForeignKey(DangerousGood, related_name='secondary_dg_rules', on_delete=models.CASCADE, null=True, blank=True, to_field='un_number')


    class Compatibility(models.TextChoices):
        COMPATIBLE = 'COMPATIBLE', _('Compatible')
        INCOMPATIBLE_PROHIBITED = 'INCOMPATIBLE_PROHIBITED', _('Incompatible - Prohibited')
        AWAY_FROM = 'AWAY_FROM', _('Away From')
        SEPARATED_FROM = 'SEPARATED_FROM', _('Separated From')
        SEPARATED_BY_COMPARTMENT = 'SEP_COMPARTMENT', _('Separated by Complete Compartment')
        SEPARATED_LONGITUDINALLY = 'SEP_LONG', _('Separated Longitudinally')
        # Add other specific segregation requirements as per IATA/IMDG/ADR etc.

    compatibility_status = models.CharField(
        _("Compatibility Status"),
        max_length=30,
        choices=Compatibility.choices,
        help_text=_("The required segregation or compatibility status.")
    )
    notes = models.TextField(
        _("Notes/Conditions"),
        blank=True,
        null=True,
        help_text=_("Specific conditions or notes for this segregation rule.")
    )
    # source_regulation = models.CharField(max_length=20, blank=True, null=True, help_text="e.g., IATA, IMDG Table X.Y")

    class Meta:
        verbose_name = _("DG Segregation/Compatibility Rule")
        verbose_name_plural = _("DG Segregation/Compatibility Rules")
        # Add unique constraints if necessary, e.g., for a pair of classes/groups
        # Consider making primary/secondary fields ordered to avoid duplicate rules like (ClassA-ClassB) and (ClassB-ClassA)
        # unique_together = [['primary_hazard_class', 'secondary_hazard_class']]

    def __str__(self):
        if self.rule_type == self.RuleType.CLASS_TO_CLASS:
            return f"Rule: Class {self.primary_hazard_class} vs Class {self.secondary_hazard_class} -> {self.get_compatibility_status_display()}"
        elif self.rule_type == self.RuleType.GROUP_TO_GROUP and self.primary_segregation_group and self.secondary_segregation_group:
            return f"Rule: Group {self.primary_segregation_group.name} vs Group {self.secondary_segregation_group.name} -> {self.get_compatibility_status_display()}"
        return f"Segregation Rule {self.id} ({self.get_rule_type_display()})"

# dangerous_goods/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from simple_history.models import HistoricalRecords
from users.models import User

class PackingGroup(models.TextChoices):
    I = 'I', _('I (High Danger)')
    II = 'II', _('II (Medium Danger)')
    III = 'III', _('III (Low Danger)')
    NONE = 'NONE', _('None / Not Applicable') # Added for DGs without PG

class PhysicalForm(models.TextChoices):
    SOLID = 'SOLID', _('Solid')
    LIQUID = 'LIQUID', _('Liquid')
    GAS = 'GAS', _('Gas')
    UNKNOWN = 'UNKNOWN', _('Unknown')

class DangerousGood(models.Model):
    """
    Represents a specific dangerous good entry, based on regulations (IATA, IMDG, ADR etc.).
    """
    un_number = models.CharField(
        _("UN Number"), max_length=10, unique=True, db_index=True,
        help_text=_("Unique UN number (e.g., UN1230).")
    )
    proper_shipping_name = models.CharField(
        _("Proper Shipping Name (PSN)"), max_length=1024, db_index=True, # Increased length
        help_text=_("Official name for transport.")
    )
    simplified_name = models.CharField(
        _("Simplified/Common Name"), max_length=1024, blank=True, null=True, # Increased length
        help_text=_("A more concise or common name.")
    )
    hazard_class = models.CharField(
        _("Hazard Class/Division"), max_length=20, db_index=True, # Increased length for complex classes e.g. "1.1A"
        help_text=_("Primary hazard class or division.")
    )
    subsidiary_risks = models.CharField(
        _("Subsidiary Risks"), max_length=100, blank=True, null=True,
        help_text=_("Comma-separated subsidiary hazard classes/divisions.")
    )
    packing_group = models.CharField(
        _("Packing Group"), max_length=5, choices=PackingGroup.choices,
        blank=True, null=True, help_text=_("Packing group indicating danger degree.")
    )
    hazard_labels_required = models.CharField(
        _("Hazard Label(s) Required"), max_length=255, blank=True, null=True,
        help_text=_("Comma-separated required hazard labels.")
    )
    erg_guide_number = models.CharField(
        _("ERG Guide Number"), max_length=10, blank=True, null=True,
        help_text=_("Emergency Response Guidebook number.")
    )
    special_provisions = models.TextField(
        _("Special Provisions"), blank=True, null=True,
        help_text=_("Applicable special provisions codes (comma-separated or text).")
    )
    qty_ltd_passenger_aircraft = models.CharField(
        _("Qty Ltd - Pax Aircraft"), max_length=50, blank=True, null=True,
        help_text=_("Quantity limitation for passenger aircraft.")
    )
    packing_instruction_passenger_aircraft = models.CharField(
        _("PI - Pax Aircraft"), max_length=50, blank=True, null=True
    )
    qty_ltd_cargo_aircraft = models.CharField(
        _("Qty Ltd - Cargo Aircraft"), max_length=50, blank=True, null=True,
        help_text=_("Quantity limitation for cargo aircraft only.")
    )
    packing_instruction_cargo_aircraft = models.CharField(
        _("PI - Cargo Aircraft"), max_length=50, blank=True, null=True
    )
    description_notes = models.TextField(
        _("Description/Notes"), blank=True, null=True,
        help_text=_("Additional descriptive notes or regulatory remarks.")
    )
    is_marine_pollutant = models.BooleanField(_("Marine Pollutant"), default=False)
    is_environmentally_hazardous = models.BooleanField(_("Environmentally Hazardous"), default=False)
    
    is_fire_risk = models.BooleanField( # Terry's suggestion
        _("Is a Fire Risk?"), default=False,
        help_text=_("Indicates if this substance inherently poses a significant fire risk.")
    )
    is_bulk_transport_allowed = models.BooleanField( # Terry's suggestion
        _("Bulk Transport Allowed?"), default=True, # Assume allowed unless specified
        help_text=_("Can this substance generally be transported in bulk quantities?")
    )
    physical_form = models.CharField( # Terry's suggestion
        _("Physical Form"), max_length=10, choices=PhysicalForm.choices,
        default=PhysicalForm.UNKNOWN, help_text=_("Typical physical form (Solid, Liquid, Gas).")
    )
    
    # Audit trail fields (Terry's suggestion)
    # created_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='created_dgs', null=True, blank=True, on_delete=models.SET_NULL)
    # updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='updated_dgs', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # last_checked_at = models.DateTimeField(_("Last Regulatory Check"), null=True, blank=True) # For tracking when data was last verified against regs

    # Add history tracking
    history = HistoricalRecords()

    class Meta:
        verbose_name = _("Dangerous Good")
        verbose_name_plural = _("Dangerous Goods")
        ordering = ['un_number']
        indexes = [
            models.Index(fields=['un_number']),
            models.Index(fields=['proper_shipping_name']),
            models.Index(fields=['hazard_class']),
            models.Index(fields=['is_fire_risk']),
        ]

    def __str__(self):
        return f"{self.un_number} - {self.proper_shipping_name}"

    def save(self, *args, **kwargs):
        # Add any pre-save logic here
        super().save(*args, **kwargs)

class DGProductSynonym(models.Model): # As defined before
    dangerous_good = models.ForeignKey(DangerousGood, related_name='synonyms', on_delete=models.CASCADE)
    synonym = models.CharField(_("Keyword/Product Name/Synonym"), max_length=255, db_index=True)
    class Source(models.TextChoices):
        MANUAL = 'MANUAL', _('Manually Entered')
        IATA_IMPORT = 'IATA_IMPORT', _('IATA Data Import')
        LEARNED_SYSTEM = 'LEARNED_SYSTEM', _('Learned by System')
        USER_CONFIRMED = 'USER_CONFIRMED', _('User Confirmed')
    source = models.CharField(_("Source of Synonym"), max_length=20, choices=Source.choices, default=Source.MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        verbose_name = _("DG Product Synonym/Keyword")
        verbose_name_plural = _("DG Product Synonyms/Keywords")
        unique_together = [['dangerous_good', 'synonym']]
        ordering = ['dangerous_good', 'synonym']
        indexes = [ models.Index(fields=['synonym']), ]
    def __str__(self):
        return f"{self.synonym} (for {self.dangerous_good.un_number})"

class SegregationGroup(models.Model): # As defined before
    code = models.CharField(_("Group Code"), max_length=20, unique=True)
    name = models.CharField(_("Group Name"), max_length=255)
    description = models.TextField(_("Description"), blank=True, null=True)
    dangerous_goods = models.ManyToManyField(DangerousGood, related_name='segregation_groups', blank=True)
    def __str__(self):
        return f"{self.name} ({self.code})"
    class Meta:
        verbose_name = _("DG Segregation Group")
        verbose_name_plural = _("DG Segregation Groups")
        ordering = ['name']

class SegregationRule(models.Model):
    class RuleType(models.TextChoices):
        CLASS_TO_CLASS = 'CLASS_CLASS', _('Class vs Class')
        GROUP_TO_GROUP = 'GROUP_GROUP', _('Segregation Group vs Segregation Group')
        CLASS_TO_GROUP = 'CLASS_GROUP', _('Class vs Segregation Group')
        # UN_TO_UN = 'UN_UN', _('UN Number vs UN Number') # Can add later

    rule_type = models.CharField(max_length=20, choices=RuleType.choices, default=RuleType.CLASS_TO_CLASS)

    primary_hazard_class = models.CharField(_("Primary Hazard Class"), max_length=20, blank=True, null=True, db_index=True)
    secondary_hazard_class = models.CharField(_("Secondary Hazard Class"), max_length=20, blank=True, null=True, db_index=True)

    primary_segregation_group = models.ForeignKey(SegregationGroup, related_name='primary_rules', on_delete=models.CASCADE, null=True, blank=True)
    secondary_segregation_group = models.ForeignKey(SegregationGroup, related_name='secondary_rules', on_delete=models.CASCADE, null=True, blank=True)

    class Compatibility(models.TextChoices):
        COMPATIBLE = 'COMPATIBLE', _('Compatible')
        INCOMPATIBLE_PROHIBITED = 'INCOMPATIBLE_PROHIBITED', _('Incompatible - Prohibited')
        CONDITIONAL_NOTES = 'CONDITIONAL_NOTES', _('Conditional - See Notes')
        AWAY_FROM = 'AWAY_FROM', _('Away From')
        SEPARATED_FROM = 'SEPARATED_FROM', _('Separated From')
        # ... other standard segregation terms ...

    compatibility_status = models.CharField(_("Compatibility Status"), max_length=30, choices=Compatibility.choices)
    
    class ConditionType(models.TextChoices): # Terry's suggestion
        NONE = 'NONE', _('No Specific Condition')
        BOTH_BULK = 'BOTH_BULK', _('If Both are Bulk') # e.g. 2.1 and 3 if both bulk
        EITHER_BULK = 'EITHER_BULK', _('If Either is Bulk')
        PRIMARY_FIRE_RISK = 'PRIMARY_FIRE_RISK', _('If Primary Item is Fire Risk') # e.g. Class 6 (fire risk) vs 5.1
        SECONDARY_FIRE_RISK = 'SECONDARY_FIRE_RISK', _('If Secondary Item is Fire Risk')
        CLASS_9_LITHIUM_FIRE_RISK = 'CLASS_9_LITHIUM_FIRE_RISK', _('If Class 9 Lithium Battery (Fire Risk)') # Specific for Class 9 fire risk vs 5.1/5.2
        AWAY_FROM_FOODSTUFFS = 'AWAY_FROM_FOODSTUFFS', _('Away From Foodstuffs') # e.g. 2.3, 6, 7, 8 vs Foodstuffs group
        CLASS_1_LEGISLATION = 'CLASS_1_LEGISLATION', _('Refer to Explosives Legislation') # For Class 1 vs fire risks
        # Add more as needed
        
    condition_type = models.CharField( # Terry's suggestion
        _("Condition Type"), max_length=50, choices=ConditionType.choices, # Increased length for longer enum keys
        default=ConditionType.NONE, blank=True, null=True
    )
    condition_value = models.CharField( # Terry's suggestion (e.g., distance for separation)
        _("Condition Value/Parameter"), max_length=255, blank=True, null=True,
        help_text=_("Parameter for the condition, if applicable (e.g., '3m' for separation distance).")
    )
    notes = models.TextField(
        _("Notes/Regulatory Reference"), blank=True, null=True,
        help_text=_("Human-readable notes, specific conditions not covered by type/value, or regulatory references.")
    )
    source_regulation = models.CharField( # Terry's suggestion
        _("Source Regulation"), max_length=100, blank=True, null=True,
        help_text=_("e.g., IATA Table 9.3.A, IMDG Segregation Table, ADR Chapter X.Y, User Defined")
    )


    class Meta:
        verbose_name = _("DG Segregation/Compatibility Rule")
        verbose_name_plural = _("DG Segregation/Compatibility Rules")
        # Consider how to best enforce uniqueness to avoid conflicting or duplicate rules.
        # This might involve a custom clean() method on the model or careful data entry.
        # For example, for CLASS_TO_CLASS, you might want to ensure that if a rule for (A, B) exists,
        # a rule for (B, A) with the same conditions isn't also created unless it's explicitly different.
        # unique_together = (
        #     ('rule_type', 'primary_hazard_class', 'secondary_hazard_class', 'condition_type'),
        #     ('rule_type', 'primary_segregation_group', 'secondary_segregation_group', 'condition_type'),
        # ) # This is a starting point for unique_together

    def __str__(self):
        parts = []
        if self.rule_type == self.RuleType.CLASS_TO_CLASS:
            parts.append(f"Class {self.primary_hazard_class or '*'} vs Class {self.secondary_hazard_class or '*'}")
        elif self.rule_type == self.RuleType.GROUP_TO_GROUP:
            p_group = self.primary_segregation_group.code if self.primary_segregation_group else '*'
            s_group = self.secondary_segregation_group.code if self.secondary_segregation_group else '*'
            parts.append(f"Group {p_group} vs Group {s_group}")
        elif self.rule_type == self.RuleType.CLASS_TO_GROUP:
            p_class = self.primary_hazard_class or '*'
            s_group = self.secondary_segregation_group.code if self.secondary_segregation_group else '*' # Assuming secondary is group
            parts.append(f"Class {p_class} vs Group {s_group}")
        else:
            parts.append(f"Rule {self.id}")
        
        parts.append(f"-> {self.get_compatibility_status_display()}")
        if self.condition_type != self.ConditionType.NONE:
            parts.append(f"(Cond: {self.get_condition_type_display()})")
        return " ".join(parts)


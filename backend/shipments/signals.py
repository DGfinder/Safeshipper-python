from django.db.models.signals import post_save, pre_save # Example common signals
from django.dispatch import receiver
# from .models import Shipment # Example: if you need to connect signals to your models

# print("shipments/signals.py loaded") # Optional: for debugging if it's being imported

# Example of a signal receiver (you can uncomment and adapt later)
# @receiver(post_save, sender=Shipment)
# def shipment_post_save_receiver(sender, instance, created, **kwargs):
#     if created:
#         print(f"Shipment {instance.tracking_number} was created!")
#     else:
#         print(f"Shipment {instance.tracking_number} was updated.")
#     # Add any logic here that should run after a Shipment is saved
#     # For example, sending a notification, updating an external system, etc.

# You can define other signal receivers here for other models or signals.